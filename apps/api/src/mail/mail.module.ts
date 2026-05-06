import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('SMTP_HOST', 'in-v3.mailjet.com'),
          port: config.get<number>('SMTP_PORT', 587),
          secure: config.get('SMTP_SECURE', 'false') === 'true',
          auth: {
            user: config.get('SMTP_USER', ''),
            pass: config.get('SMTP_PASS', ''),
          },
        },
        defaults: {
          from: config.get('SMTP_FROM', '"TCG Nexus" <noreply@tcg-nexus.org>'),
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
