import '../src/load-env';
import { MailService } from '../src/infra/mail/mail.service';

async function main(): Promise<void> {
  const to = process.argv[2] || process.env.MAIL_TO || process.env.SMTP_USER;
  const subject = process.argv[3] || process.env.MAIL_SUBJECT;
  const body = process.argv[4] || process.env.MAIL_BODY;

  if (!to) {
    console.error('Usage: ./dssh mailtest [to] [title] [body]');
    console.error('Example: ./dssh mailtest you@example.com "SMTP check" "Hello from local"');
    console.error('Defaults: to=MAIL_TO, title="Portfolio SMTP test", body=a short canned message.');
    process.exit(1);
  }

  if (!process.env.SMTP_HOST) {
    console.error('SMTP_HOST is not set.');
    process.exit(1);
  }

  const mail = new MailService();
  await mail.onModuleInit();
  await mail.sendTestEmail(to, subject, body);
  console.log(`Sent test email to ${to} as ${process.env.SMTP_FROM ?? 'admin@austenstrine.dev'}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
