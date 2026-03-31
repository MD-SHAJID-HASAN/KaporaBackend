import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// Verify SMS OTP
export const verifySMS = async (sessionId, otp) => {
  if (!TWO_FACTOR_KEY) {
    console.log(`[OTP verification skipped] Session: ${sessionId}, OTP: ${otp}`);
    // Always return true in dev mode
    return true;
  }

  try {
    const response = await axios.get(
      `https://2factor.in/API/V1/${TWO_FACTOR_KEY}/SMS/VERIFY/${sessionId}/${otp}`
    );

    return response.data.Status === "Success";
  } catch (err) {
    console.error("2Factor Verify OTP Error:", err.response?.data || err);
    return false;
  }
};