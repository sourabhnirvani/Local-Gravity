import { ipcMain } from 'electron';
import nodemailer from 'nodemailer';

export function setupFeedbackHandlers() {
  ipcMain.handle('send-feedback', async (_, payload: { name?: string; email?: string; message: string }) => {
    try {
      const name = payload.name?.trim();
      const email = payload.email?.trim();
      const message = payload.message?.trim();

      if (!message) {
        throw new Error('Message is required');
      }

      const smtpUser = process.env.SMTP_USER || 'novaaidrive@gmail.com';
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpPass) {
        console.log('LocalGravity feedback received in dev mode');
        console.log(`Name: ${name || 'Anonymous'}`);
        console.log(`Email: ${email || 'Not provided'}`);
        console.log(`Message:\n${message}`);
        return { success: true, message: 'Feedback sent successfully' };
      }

      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: email ? `"${name || 'LocalGravity User'}" <${email}>` : `"LocalGravity" <${smtpUser}>`,
        to: 'novaaidrive@gmail.com',
        subject: 'LocalGravity Feedback',
        text: `Subject: LocalGravity Feedback\n\nName: ${name || 'Anonymous'}\nEmail: ${email || 'Not provided'}\n\nMessage:\n${message}`,
      });

      return { success: true, message: 'Feedback sent successfully' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send feedback';
      console.error('Feedback error:', message);
      return { success: false, error: message };
    }
  });
}
