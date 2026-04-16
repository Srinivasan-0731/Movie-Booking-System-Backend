import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


export const verifyMailer = async () => {
  try {
    await transporter.verify();
    console.log(" Brevo SMTP connected");
  } catch (err) {
    console.log(" SMTP error:", err);
  }
};


export const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      html,
    });

    return response;

  } catch (error) {
    console.log("EMAIL SEND ERROR:", error);
    throw new Error("Email sending failed");
  }
};