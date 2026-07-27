import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailOtpPurpose, User } from '@prisma/client';
import { MailService } from '../../infra/mail/mail.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import type {
  AccessTokenPayload,
  PendingLoginTokenPayload,
} from './interfaces/jwt-payload.interface';
import { SecurityService } from './security/security.service';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const PENDING_TOKEN_TTL_SECONDS = 10 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;
const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Generic messages avoid confirming whether an email is registered.
const GENERIC_REGISTER_MESSAGE =
  'If that email can be registered, a verification code has been sent.';
const GENERIC_LOGIN_ERROR = 'Invalid email or password.';

export type SessionMeta = {
  userAgent?: string;
  ipAddress?: string;
};

export type IssuedSession = {
  user: User;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly security: SecurityService,
  ) {}

  // ---------- Registration & email verification ----------

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const email = this.security.normalizeEmail(dto.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing?.emailVerifiedAt) {
      // Account already active: stay silent so registration can't be used to
      // discover which emails already have accounts.
      return { message: GENERIC_REGISTER_MESSAGE };
    }

    const passwordHash = await this.security.hashPassword(dto.password);

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash },
        })
      : await this.prisma.user.create({
          data: { email, passwordHash },
        });

    await this.issueOtp(user.id, EmailOtpPurpose.EMAIL_VERIFICATION);

    return { message: GENERIC_REGISTER_MESSAGE };
  }

  async verifyEmail(dto: VerifyEmailDto, meta: SessionMeta): Promise<IssuedSession> {
    const email = this.security.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('Invalid or expired code.');
    }

    await this.consumeOtp(user.id, EmailOtpPurpose.EMAIL_VERIFICATION, dto.code);

    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    return this.issueSession(verifiedUser, meta);
  }

  // ---------- Password login (first factor) ----------

  async login(dto: LoginDto): Promise<{ pendingToken: string; expiresInSeconds: number }> {
    const email = this.security.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always run a hash comparison, even for unknown users, so response
    // timing does not reveal whether the account exists.
    const dummyHash =
      '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Too many failed attempts. Try again later.');
    }

    const passwordValid = await this.security.verifyPassword(
      user?.passwordHash ?? dummyHash,
      dto.password,
    );

    if (!user || !user.passwordHash || !passwordValid) {
      if (user) {
        await this.registerFailedLogin(user);
      }
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email before signing in.');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return this.beginTwoFactorChallenge(user);
  }

  private async registerFailedLogin(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const locked = attempts >= MAX_LOGIN_ATTEMPTS;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: locked ? 0 : attempts,
        lockedUntil: locked
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null,
      },
    });
  }

  // ---------- Email 2FA (second factor, required every session) ----------

  private async beginTwoFactorChallenge(
    user: User,
  ): Promise<{ pendingToken: string; expiresInSeconds: number }> {
    await this.issueOtp(user.id, EmailOtpPurpose.LOGIN_2FA);

    const payload: PendingLoginTokenPayload = { sub: user.id, type: 'login_2fa' };
    const pendingToken = await this.jwt.signAsync(payload, {
      secret: this.pendingSecret(),
      expiresIn: PENDING_TOKEN_TTL_SECONDS,
    });

    return { pendingToken, expiresInSeconds: PENDING_TOKEN_TTL_SECONDS };
  }

  async verifyLoginOtp(dto: VerifyLoginOtpDto, meta: SessionMeta): Promise<IssuedSession> {
    let payload: PendingLoginTokenPayload;

    try {
      payload = await this.jwt.verifyAsync<PendingLoginTokenPayload>(dto.pendingToken, {
        secret: this.pendingSecret(),
      });
    } catch {
      throw new UnauthorizedException('This sign-in attempt has expired. Please log in again.');
    }

    if (payload.type !== 'login_2fa') {
      throw new UnauthorizedException('Invalid session token.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      throw new UnauthorizedException('Invalid session token.');
    }

    await this.consumeOtp(user.id, EmailOtpPurpose.LOGIN_2FA, dto.code);

    return this.issueSession(user, meta);
  }

  // ---------- Google OAuth ----------

  async findOrCreateGoogleUser(googleId: string, rawEmail: string): Promise<User> {
    const email = this.security.normalizeEmail(rawEmail);
    const existingByGoogleId = await this.prisma.user.findUnique({ where: { googleId } });

    if (existingByGoogleId) {
      return existingByGoogleId;
    }

    const existingByEmail = await this.prisma.user.findUnique({ where: { email } });

    if (existingByEmail) {
      return this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId,
          // Google has already verified ownership of this address.
          emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
        },
      });
    }

    return this.prisma.user.create({
      data: { email, googleId, emailVerifiedAt: new Date() },
    });
  }

  async beginTwoFactorForGoogleUser(
    user: User,
  ): Promise<{ pendingToken: string; expiresInSeconds: number }> {
    return this.beginTwoFactorChallenge(user);
  }

  // ---------- Sessions (access + refresh tokens) ----------

  private async issueSession(user: User, meta: SessionMeta): Promise<IssuedSession> {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = this.security.generateOpaqueToken();
    const refreshTokenExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.security.hashOpaqueToken(refreshToken),
        familyId: this.security.generateOpaqueToken(),
        expiresAt: refreshTokenExpiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return {
      user,
      accessToken,
      refreshToken,
      accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresAt,
    };
  }

  async refreshSession(rawRefreshToken: string, meta: SessionMeta): Promise<IssuedSession> {
    const tokenHash = this.security.hashOpaqueToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    if (existing.revokedAt) {
      // A previously-rotated token was reused: treat as theft and burn the
      // whole token family so a stolen cookie cannot keep refreshing.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const newRefreshToken = this.security.generateOpaqueToken();
    const newTokenHash = this.security.hashOpaqueToken(newRefreshToken);
    const refreshTokenExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date(), replacedByTokenHash: newTokenHash },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: newTokenHash,
          familyId: existing.familyId,
          expiresAt: refreshTokenExpiresAt,
          userAgent: meta.userAgent,
          ipAddress: meta.ipAddress,
        },
      }),
    ]);

    const accessToken = await this.signAccessToken(existing.user);

    return {
      user: existing.user,
      accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresAt,
    };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const tokenHash = this.security.hashOpaqueToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing || existing.revokedAt) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { familyId: existing.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // ---------- OTP helpers ----------

  private async issueOtp(userId: string, purpose: EmailOtpPurpose): Promise<void> {
    const code = this.security.generateOtpCode();
    const codeHash = this.security.hashOtpCode(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.emailOtp.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await this.prisma.emailOtp.create({
      data: { userId, purpose, codeHash, expiresAt },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user) {
      await this.mail
        .sendOtpEmail(user.email, code, purpose === EmailOtpPurpose.EMAIL_VERIFICATION ? 'verify' : 'login')
        .catch(() => undefined);
    }
  }

  private async consumeOtp(
    userId: string,
    purpose: EmailOtpPurpose,
    code: string,
  ): Promise<void> {
    const otp = await this.prisma.emailOtp.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code.');
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Request a new code.');
    }

    if (!this.security.compareOtpHash(code, otp.codeHash)) {
      await this.prisma.emailOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid or expired code.');
    }

    await this.prisma.emailOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }

  // ---------- JWT helpers ----------

  private async signAccessToken(user: User): Promise<string> {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email, type: 'access' };

    return this.jwt.signAsync(payload, {
      secret: this.accessSecret(),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  private accessSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured.');
    }

    return secret;
  }

  private pendingSecret(): string {
    const secret = process.env.JWT_PENDING_SECRET;

    if (!secret) {
      throw new Error('JWT_PENDING_SECRET is not configured.');
    }

    return secret;
  }

  get accessTokenTtlSeconds(): number {
    return ACCESS_TOKEN_TTL_SECONDS;
  }

  get refreshTokenTtlMs(): number {
    return REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  }
}
