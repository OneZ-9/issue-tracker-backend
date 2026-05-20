import { RESPONSE_MESSAGES } from "../constants/response-messages.js";
import {
  SENDER_EMAIL_ADDRESS,
  SENDER_EMAIL_PASSWORD,
} from "../constants/shared-constants.js";
import OtpVerification from "../models/otp-verification-model.js";
import User from "../models/user-model.js";
import EmailService from "../services/email-service.js";
import handleError from "../utils/handle-error.js";
import handleResponse from "../utils/handle-response.js";

const generateOTP = () => {
  // Generate a random 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString(); // Convert the number to a string
};

export const verifyOtp = async ({ otp, email }) => {
  try {
    const isOtpVerified = await OtpVerification.findOne({
      otp,
      email,
      isActive: true,
    });

    if (isOtpVerified) {
      // Check expiry: OTP should be valid for 5 minutes from creation
      const createdAt = isOtpVerified.createdAt;
      const now = new Date();
      const diffMs = now - createdAt; // milliseconds
      const expiryMs = 5 * 60 * 1000; // 5 minutes

      if (diffMs > expiryMs) {
        // mark as inactive and treat as invalid
        isOtpVerified.isActive = false;
        await isOtpVerified.save();
        return false;
      }

      // Valid OTP: consume it
      isOtpVerified.isActive = false;
      await isOtpVerified.save();

      return true;
    } else {
      return false;
    }
  } catch (error) {
    throw error;
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user with the provided email exists
    const user = await User.findOne({ email });
    if (user) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.OTP_SEND_FAILED_USER_ALREADY_EXISTS,
        error: new Error("User with this email already exists"),
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Send OTP via email
    const otpSendingResult = await EmailService.sendEmail({
      senderEmailAddress: SENDER_EMAIL_ADDRESS,
      senderPassword: SENDER_EMAIL_PASSWORD,
      recepientEmailAddress: email,
      subject: "Your OTP Code",
      htmlEmailBody: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
    <h2 style="color: #003459; margin-bottom: 16px;">
      Verify Your Email Address
    </h2>

    <p style="font-size: 16px; line-height: 1.6;">
      Thank you for using <strong>Issue Tracker</strong>.
      Please use the following One-Time Password (OTP) to complete your verification:
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <span
        style="
          display: inline-block;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #003459;
          background-color: #F7DBA7;
          padding: 16px 32px;
          border-radius: 8px;
        "
      >
        ${otp}
      </span>
    </div>

    <p style="font-size: 15px; line-height: 1.6;">
      If you did not request this verification code, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

    <p style="font-size: 13px; color: #667479; margin: 0;">
      © ${new Date().getFullYear()} Issue Tracker. All rights reserved.
    </p>
  </div>
`,
    });

    if (otpSendingResult === "EMAIL_SENT") {
      //disable old otps if any
      await OtpVerification.updateMany(
        { email: email, isActive: true },
        { $set: { isActive: false } },
      );

      // Save OTP to the database
      const newOtp = new OtpVerification({
        email,
        otp,
      });
      await newOtp.save();

      return handleResponse({
        res,
        metaData: RESPONSE_MESSAGES.OTP_SEND_SUCCESS,
      });
    } else {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.OTP_SEND_FAILED,
        error: new Error("Email sending failed"),
      });
    }
  } catch (error) {
    handleError({
      res,
      metaData: RESPONSE_MESSAGES.OTP_SEND_FAILED,
      error,
    });
  }
};
