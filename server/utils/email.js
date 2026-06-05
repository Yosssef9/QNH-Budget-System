import nodemailer from "nodemailer";
import { logger } from "./logger.js";
import { ApiError } from "./apiError.js";
import path from "path";

const EMAIL_ENABLED = process.env.EMAIL_ENABLED?.toLowerCase() === "true";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, cc, subject, text, html }) {
  if (!to) {
    throw new ApiError(400, "Email recipient is required", "EMAIL_TO_REQUIRED");
  }

  // =====================================
  // EMAIL FEATURE TOGGLE
  // =====================================

  if (!EMAIL_ENABLED) {
    logger.info({
      message: "Email skipped (EMAIL_ENABLED=false)",
      to,
      cc,
      subject,
    });

    return {
      skipped: true,
      reason: "EMAIL_DISABLED",
    };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      cc,
      subject,
      text,
      html,

      attachments: [
        {
          filename: "qnh-logo.png",

          path: path.join(
            process.cwd(),
            "notifications",
            "assets",
            "qnh-logo.png",
          ),

          cid: "qnh-logo",
        },
      ],
    });

    logger.info({
      message: "Email sent",
      to,
      subject,
      messageId: info.messageId,
    });

    return info;
  } catch (error) {
    logger.error({
      message: "Email sending failed",
      to,
      subject,
      error: error.message,
      stack: error.stack,
    });

    throw new ApiError(500, "Failed to send email", "EMAIL_SEND_FAILED");
  }
}
