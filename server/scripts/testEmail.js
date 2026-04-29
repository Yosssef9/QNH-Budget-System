import "../config/env.js";
import { sendEmail } from "../utils/email.js";

async function test() {
  try {
    await sendEmail({
      to: "yossefyasser561@gmail.com", // change to your email
      subject: "Test Email from Budget System",
      html: "<h2>✅ Email is working!</h2>",
    });

    console.log("Email sent successfully");
    process.exit(0);
  } catch (err) {
    console.error("Email failed:", err.message);
    process.exit(1);
  }
}

test();
