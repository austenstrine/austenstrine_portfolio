import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService, type IssuedSession, type SessionMeta } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private baseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN,
    };
  }

  private setSessionCookies(res: Response, session: IssuedSession): void {
    res.cookie(ACCESS_COOKIE, session.accessToken, {
      ...this.baseCookieOptions(),
      path: '/',
      maxAge: session.accessTokenExpiresInSeconds * 1000,
    });

    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.baseCookieOptions(),
      path: '/api/auth',
      expires: session.refreshTokenExpiresAt,
    });
  }

  private clearSessionCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, { ...this.baseCookieOptions(), path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...this.baseCookieOptions(), path: '/api/auth' });
  }

  private sessionMeta(req: Request): SessionMeta {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }

  private toPublicUser(session: IssuedSession) {
    return {
      user: { id: session.user.id, email: session.user.email },
      accessTokenExpiresInSeconds: session.accessTokenExpiresInSeconds,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.verifyEmail(dto, this.sessionMeta(req));
    this.setSessionCookies(res, session);
    return this.toPublicUser(session);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login/verify')
  async verifyLoginOtp(
    @Body() dto: VerifyLoginOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.verifyLoginOtp(dto, this.sessionMeta(req));
    this.setSessionCookies(res, session);
    return this.toPublicUser(session);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];

    if (!rawRefreshToken) {
      this.clearSessionCookies(res);
      return { message: 'No active session.' };
    }

    try {
      const session = await this.authService.refreshSession(rawRefreshToken, this.sessionMeta(req));
      this.setSessionCookies(res, session);
      return this.toPublicUser(session);
    } catch (error) {
      this.clearSessionCookies(res);
      throw error;
    }
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearSessionCookies(res);
    return { message: 'Logged out.' };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Guard redirects to Google; handler body is unreachable.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string };
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';

    if (!user) {
      res.redirect(`${webUrl}/auth/login?error=google`);
      return;
    }

    const fullUser = await this.authService.getUserById(user.id);

    if (!fullUser) {
      res.redirect(`${webUrl}/auth/login?error=google`);
      return;
    }

    const { pendingToken } = await this.authService.beginTwoFactorForGoogleUser(fullUser);
    res.redirect(`${webUrl}/auth/verify?pendingToken=${encodeURIComponent(pendingToken)}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: string; email: string }) {
    return { user };
  }
}
