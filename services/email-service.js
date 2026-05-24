import nodemailer from "nodemailer";

class EmailService {
  static async sendEmail({
    recepientEmailAddress,
    subject,
    htmlEmailBody,
    attachments = [],
  }) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SENDER_EMAIL_ADDRESS,
          pass: process.env.SENDER_EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.SENDER_EMAIL_ADDRESS,
        to: recepientEmailAddress,
        subject,
        html: htmlEmailBody,
        attachments,
      };

      const info = await transporter.sendMail(mailOptions);

      console.log("EMAIL_SENT:", info.messageId);
      return "EMAIL_SENT";
    } catch (error) {
      console.error("EMAIL_ERROR:", error);
      throw error;
    }
  }
}

export default EmailService;
