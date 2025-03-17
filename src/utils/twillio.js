const twilio = require("twilio");

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send verification code
const sendVerificationCode = async (phoneNumber) => {
  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phoneNumber, channel: "sms" });

    return verification;
  } catch (err) {
    console.error("Error sending verification code:", err);
    throw err;
  }
};

// Verify the code entered by the user
const verifyCode = async (phoneNumber, code) => {
  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phoneNumber, code });

    return verificationCheck;
  } catch (err) {
    console.error("Error verifying code:", err);
    throw err;
  }
};

module.exports = { sendVerificationCode, verifyCode };