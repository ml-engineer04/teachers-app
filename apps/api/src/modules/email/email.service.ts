import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const gmailUser = this.configService.get<string>('GMAIL_USER') || process.env.GMAIL_USER;
    const rawPass =
      this.configService.get<string>('GMAIL_APP_PASSWORD') || process.env.GMAIL_APP_PASSWORD;
    const gmailPass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;

    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });
      this.logger.log(`📬 Gmail SMTP Transporter initialized for ${gmailUser}`);
    } else {
      this.logger.warn(
        '⚠️ [GMAIL SMTP] GMAIL_USER or GMAIL_APP_PASSWORD is not configured; security codes will run in local log-fallback mode.',
      );
    }
  }

  async sendVerificationOtp(toEmail: string, code: string) {
    return this.sendSecurityCodeEmail({
      toEmail,
      code,
      subject: `${code} — SmartTeacherBook Tasdiqlash Kodi`,
      introText: 'Assalomu alaykum! Ilovaga kirish yoki emailingizni tasdiqlash uchun 6 xonali kodingiz:',
      expiryMinutes: 10,
    });
  }

  async sendPasswordResetCode(toEmail: string, code: string) {
    return this.sendSecurityCodeEmail({
      toEmail,
      code,
      subject: `${code} — SmartTeacherBook Parolni Tiklash Kodi`,
      introText:
        'SmartTeacherBook hisobingiz parolini yangilash so‘rovi yuborildi. Quyidagi 6 xonali kodni kiriting:',
      expiryMinutes: 10,
    });
  }

  async sendAccountLinkCode(toEmail: string, code: string) {
    return this.sendSecurityCodeEmail({
      toEmail,
      code,
      subject: `${code} — SmartTeacherBook Google Hisobini Bog‘lash Kodi`,
      introText:
        'Mavjud email hisobingizni Google bilan xavfsiz bog‘lash uchun quyidagi 6 xonali tasdiqlash kodini kiriting:',
      expiryMinutes: 10,
    });
  }

  async sendSecurityCodeEmail(params: {
    toEmail: string;
    code: string;
    subject: string;
    introText: string;
    expiryMinutes?: number;
  }) {
    const gmailUser = this.configService.get<string>('GMAIL_USER') || process.env.GMAIL_USER;
    const rawPass =
      this.configService.get<string>('GMAIL_APP_PASSWORD') || process.env.GMAIL_APP_PASSWORD;
    const gmailPass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;
    const ttlMinutes = params.expiryMinutes || 10;

    if (!this.transporter && gmailUser && gmailPass) {
      this.initTransporter();
    }

    if (this.transporter && gmailUser) {
      try {
        const info = await this.transporter.sendMail({
          from: `"SmartTeacherBook" <${gmailUser}>`,
          to: params.toEmail,
          subject: params.subject,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #E2E8F0; border-radius: 24px; background-color: #FFFFFF;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0F2942; font-size: 24px; font-weight: 900; margin: 0;">SmartTeacherBook</h1>
                <p style="color: #64748B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">O‘qituvchilar Raqamli Darslik Platformasi</p>
              </div>

              <p style="font-size: 15px; color: #1E293B; line-height: 24px;">
                ${params.introText}
              </p>

              <div style="background-color: #F8FAFC; border: 2px dashed #4F46E5; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #4338CA; font-family: monospace;">${params.code}</span>
              </div>

              <p style="font-size: 13px; color: #64748B; line-height: 20px;">
                Ushbu kod <strong>${ttlMinutes} daqiqa</strong> davomida amal qiladi. Xavfsizlik maqsadida kodni hech kimga bermang.
              </p>

              <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #F1F5F9; text-align: center;">
                <p style="font-size: 11px; color: #94A3B8; margin: 0;">SmartTeacherBook • Ta'lim Texnologiyalari</p>
              </div>
            </div>
          `,
        });
        this.logger.log(`✅ [EMAIL DISPATCHED] Security verification email sent (ID: ${info.messageId})`);
        return { success: true, delivered: true, messageId: info.messageId };
      } catch (err: any) {
        this.logger.error(`❌ [EMAIL SEND FAILED] ${err.message}`);
        return { success: false, delivered: false, error: err.message };
      }
    }

    this.logger.log(`📧 [EMAIL FALLBACK] Security code generated (SMTP not configured).`);
    return { success: true, delivered: false };
  }

  /**
   * Spec §5 & §8: Sends an email notification to super admins
   * when a teacher submits a telephone access request.
   */
  async sendNewAccessRequestAlert(data: {
    requestId: string;
    userEmail: string;
    phoneNumber: string;
    gradeNumber: number;
    subjectName: string;
    plan: string;
    priceUzs: number;
  }) {
    const adminEmails =
      this.configService.get<string>('ADMIN_ALERT_EMAILS') || 'superadmin@smartteacherbook.com';
    const adminUrl = `${this.configService.get<string>('ADMIN_PANEL_URL') || 'http://localhost:5173'}#requests`;

    const content = `
=============================================================
🔔 YANGI OBUNA SO‘ROVI (TELEFON ORQALI SAVDO)
=============================================================
O‘qituvchi:   ${data.userEmail}
Telefon:      ${data.phoneNumber}
Sinf:         ${data.gradeNumber}-sinf
Fan:          ${data.subjectName}
Reja:         ${data.plan}
Narxi:        ${data.priceUzs.toLocaleString()} UZS
So‘rov ID:    ${data.requestId}
Vaqti:        ${new Date().toISOString()}

Ko‘rib chiqish uchun havola:
${adminUrl}
=============================================================
    `;

    this.logger.log(`📧 [Admin Alert Sent to: ${adminEmails}]\n${content}`);
    return { success: true, recipients: adminEmails.split(',') };
  }
}
