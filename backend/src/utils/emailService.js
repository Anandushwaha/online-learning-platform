import nodemailer from "nodemailer";

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email message
 */
export const sendEmail = async (options) => {
  // In production, you would use a real email service
  // For development, we'll use ethereal.email (fake SMTP service)

  // Create a test account if needed
  // const testAccount = await nodemailer.createTestAccount();

  // Create reusable transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Define email options
  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);

  // For development, log the preview URL
  if (process.env.NODE_ENV === "development") {
    console.log(`Message sent: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }
};

/**
 * Send password reset email
 * @param {Object} options
 */
export const sendPasswordResetEmail = async (options) => {
  try {
    await sendEmail({
      email: options.email,
      subject: options.subject,
      message: options.message,
    });
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Error sending email");
  }
};
