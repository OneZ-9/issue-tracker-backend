import nodemailer from "nodemailer";

class EmailService {
  static sendEmail({
    senderEmailAddress,
    senderPassword,
    recepientEmailAddress,
    subject,
    htmlEmailBody,
    attachments = [],
  }) {
    return new Promise((resolve, reject) => {
      let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: senderEmailAddress,
          pass: senderPassword,
        },
      });

      let mailOptions = {
        from: senderEmailAddress,
        to: recepientEmailAddress,
        subject: subject,
        html: htmlEmailBody,
        attachments: attachments,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          reject(error);
        } else {
          console.log("EMAIL_SENT");
          console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
          resolve("EMAIL_SENT");
        }
      });
    });
  }
}

export default EmailService;
