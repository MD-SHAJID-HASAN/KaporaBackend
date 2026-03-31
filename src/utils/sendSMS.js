// src/utils/sms.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const TWO_FACTOR_KEY = process.env.TWO_FACTOR_API_KEY;

// Send SMS
export const sendSMS = async (phone) => {
  if (!TWO_FACTOR_KEY) {
    console.log(`[SMS skipped] Phone: ${phone}`);
    // Return fake sessionId for testing
    return "FAKE_SESSION_ID";
  }

  try {
    const response = await axios.get(
      `https://2factor.in/API/V1/${TWO_FACTOR_KEY}/SMS/${phone}/AUTOGEN`
    );

    if (response.data.Status !== "Success") return null;

    return response.data.Details; // sessionId
  } catch (err) {
    console.error("2Factor Send SMS Error:", err.response?.data || err);
    return null;
  }
};

