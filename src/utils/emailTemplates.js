// utils/emailTemplates.js

export const otpTemplate = (otp) => `
  <div style="font-family: Arial; background:#f9fafb; padding:30px;">
    <div style="max-width:600px;margin:auto;background:white;border-radius:10px;padding:30px;">
      <h2 style="text-align:center;color:#0ea5e9;">Your OTP Code</h2>
      <p style="font-size:16px;color:#333;">Use the OTP below to complete your login:</p>

      <div style="text-align:center;margin:20px 0;">
        <div style="
          display:inline-block;
          font-size:32px;
          letter-spacing:8px;
          font-weight:bold;
          padding:15px 25px;
          background:#0ea5e9;
          color:white;
          border-radius:8px;">
          ${otp}
        </div>
      </div>

      <p style="font-size:14px;color:#666;">
        This OTP is valid for <strong>5 minutes</strong>.  
        Do not share it with anyone.
      </p>
    </div>
  </div>
`;

export const resetTemplate = (link) => `
  <div style="font-family:Arial; background:#f9fafb; padding:30px;">
    <div style="max-width:600px;margin:auto;background:white;border-radius:10px;padding:30px;">
      <h2>Password Reset Request</h2>
      <p>Click the button below to set a new password:</p>

      <a href="${link}" 
         style="display:inline-block;background:#14b8a6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Reset Password
      </a>

      <p>This link expires in <b>15 minutes</b>.</p>
    </div>
  </div>
`;
