import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM ?? 'no-reply@austenstrine.dev';

    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }

  async sendOtpEmail(to: string, code: string, purpose: 'verify' | 'login'): Promise<void> {
    const subject = purpose === 'verify'
      ? 'Confirm your email address'
      : 'Your sign-in code';

    const intro = purpose === 'verify'
      ? 'Use this code to confirm your email address:'
      : 'Use this code to finish signing in:';

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        text: `${intro}\n\n${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`,
        html: `
          <p>${intro}</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p>
          <p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send ${purpose} email to ${to}`, error as Error);
      throw error;
    }
  }
}
