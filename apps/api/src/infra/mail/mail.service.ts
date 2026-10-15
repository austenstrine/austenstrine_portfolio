import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

function smtpPass(raw: string | undefined): string | undefined {
  return raw?.replace(/\s+/g, '') || undefined;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;
  private readonly smtpUser: string | undefined;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM ?? 'Austen Strine <admin@austenstrine.dev>';
    this.smtpUser = process.env.SMTP_USER || undefined;
    const pass = smtpPass(process.env.SMTP_PASS);

    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      requireTLS: process.env.SMTP_SECURE !== 'true',
      auth: this.smtpUser && pass
        ? {
            user: this.smtpUser,
            pass,
          }
        : undefined,
    });
  }

  async onModuleInit(): Promise<void> {
    if (!process.env.SMTP_HOST) {
      this.logger.warn('SMTP_HOST is not set; outbound email will fail until it is configured.');
      return;
    }

    try {
      await this.transporter.verify();
      this.logger.log(`SMTP ready, sending as ${this.fromAddress}`);
    } catch (error) {
      this.logger.error('SMTP verification failed', error as Error);
    }
  }

  async sendOtpEmail(
    to: string,
    code: string,
    purpose: 'verify' | 'login' | 'reset',
  ): Promise<void> {
    const copy = {
      verify: {
        subject: 'Confirm your email address',
        intro: 'Use this code to confirm your email address:',
      },
      login: {
        subject: 'Your sign-in code',
        intro: 'Use this code to finish signing in:',
      },
      reset: {
        subject: 'Reset your password',
        intro: 'Use this code to reset your password:',
      },
    }[purpose];

    await this.sendMail({
      to,
      subject: copy.subject,
      text: `${copy.intro}\n\n${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `
          <p>${copy.intro}</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p>
          <p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
        `,
    });
  }

  async sendTestEmail(to: string, subject?: string, body?: string): Promise<void> {
    const text = body
      ?? `This is a test message from the portfolio API, sent as ${this.fromAddress}.`;

    await this.sendMail({
      to,
      subject: subject || 'Portfolio SMTP test',
      text,
      html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
    });
  }

  private async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        replyTo: this.fromAddress,
        envelope: this.smtpUser
          ? { from: this.smtpUser, to: options.to }
          : undefined,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (error) {
      this.logger.error(`Failed to send "${options.subject}" to ${options.to}`, error as Error);
      throw error;
    }
  }
}
