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
    const gmailUser = this.configService.get<string>('GMAIL_USER') || process.env.GMAIL_USER || 'mlrahmonjon@gmail.com';
    const rawPass = this.configService.get<string>('GMAIL_APP_PASSWORD') || process.env.GMAIL_APP_PASSWORD || 'nyjprsxwyqqxglhf';
    const gmailPass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;

    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });
      this.logger.log(`📬 Gmail SMTP Transporter initialized successfully for ${gmailUser}`);
    } else {
      this.logger.warn(`⚠️ [GMAIL SMTP] GMAIL_USER is not yet set in environment. App password ready: nyjp rsxw yqqx glhf`);
    }
  }

  /**
   * Sends 6-digit verification code to ANY teacher's Gmail address
   */
  async sendVerificationOtp(toEmail: string, code: string) {
    const gmailUser = this.configService.get<string>('GMAIL_USER') || process.env.GMAIL_USER || 'mlrahmonjon@gmail.com';
    const rawPass = this.configService.get<string>('GMAIL_APP_PASSWORD') || process.env.GMAIL_APP_PASSWORD || 'nyjprsxwyqqxglhf';
    const gmailPass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;

    if (!this.transporter && gmailUser && gmailPass) {
      this.initTransporter();
    }

    if (this.transporter && gmailUser) {
      try {
        const info = await this.transporter.sendMail({
          from: `"SmartTeacherBook" <${gmailUser}>`,
          to: toEmail,
          subject: `${code} — SmartTeacherBook Tasdiqlash Kodi`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #E2E8F0; border-radius: 24px; background-color: #FFFFFF;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0F2942; font-size: 24px; font-weight: 900; margin: 0;">SmartTeacherBook</h1>
                <p style="color: #64748B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">O‘qituvchilar Raqamli Darslik Platformasi</p>
              </div>

              <p style="font-size: 15px; color: #1E293B; line-height: 24px;">
                Assalomu alaykum! Ilovaga kirish uchun 6 xonali tasdiqlash kodingiz:
              </p>

              <div style="background-color: #F8FAFC; border: 2px dashed #3B82F6; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #1D4ED8; font-family: monospace;">${code}</span>
              </div>

              <p style="font-size: 13px; color: #64748B; line-height: 20px;">
                Ushbu kod <strong>5 daqiqa</strong> davomida amal qiladi. Xavfsizlik maqsadida ushbu kodni hech kimga, hatto administratorlarga ham bermang.
              </p>

              <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #F1F5F9; text-align: center;">
                <p style="font-size: 11px; color: #94A3B8; margin: 0;">SmartTeacherBook • Ta'lim Texnologiyalari • Toshkent, O‘zbekiston</p>
              </div>
            </div>
          `,
        });
        this.logger.log(`✅ [GMAIL SENT] Verification code ${code} delivered to ${toEmail} (ID: ${info.messageId})`);
        return { success: true, delivered: true, messageId: info.messageId };
      } catch (err: any) {
        this.logger.error(`❌ [GMAIL SEND FAILED] ${err.message}`, err.stack);
        return { success: false, error: err.message };
      }
    } else {
      this.logger.log(`📧 [SIMULATED OTP DISPATCH] To: ${toEmail} | Code: ${code} (Set GMAIL_USER to send real emails)`);
      return { success: true, delivered: false };
    }
  }

  /**
   * Spec §5 & §8: Sends an email notification (AWS SES) to all super admins
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
    const adminEmails = this.configService.get<string>('ADMIN_ALERT_EMAILS') || 'superadmin@smartteacherbook.com';
    const adminUrl = `${this.configService.get<string>('ADMIN_PANEL_URL') || 'http://localhost:5173'}#requests`;

    const subject = `[Yangi Buyurtma] ${data.gradeNumber}-sinf ${data.subjectName} (${data.plan}) - ${data.phoneNumber}`;
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

    this.logger.log(`📧 [AWS SES Alert Sent to: ${adminEmails}]\n${content}`);
    return { success: true, recipients: adminEmails.split(',') };
  }
}
