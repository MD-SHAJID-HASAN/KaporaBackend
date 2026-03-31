// src/utils/sendMail.js
import Brevo from "@getbrevo/brevo";

// Check if BREVO_SECRET is defined
const BREVO_SECRET = process.env.BREVO_SECRET;
let apiInstance = null;

if (BREVO_SECRET) {
  apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    BREVO_SECRET
  );
  console.log("Brevo email enabled.");
} else {
  console.log("Brevo email disabled (no API key).");
}

/**
 * sendMail
 * @param {Object} param0
 * @param {string} param0.to - recipient email
 * @param {string} param0.subject - email subject
 * @param {string} param0.htmlContent - HTML content
 */
export const sendMail = async ({ to, subject, htmlContent }) => {
  if (!BREVO_SECRET) {
    // Skip sending email but log it
    console.log(
      `[Mail skipped] To: ${to}, Subject: ${subject}\nContent: ${htmlContent}`
    );
    return Promise.resolve();
  }

  const email = {
    to: [{ email: to }],
    sender: {
      name: "Your Own Shopping Store",
      email: "shajid@gmail.com",
    },
    subject,
    htmlContent,
  };

  try {
    await apiInstance.sendTransacEmail(email);
    console.log("Brevo email sent to:", to);
  } catch (err) {
    console.error("Brevo email failed:", err);
    // You can choose to throw or just log
    // throw err;
  }
};