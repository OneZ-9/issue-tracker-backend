import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);
// Automatically remove OTP documents 5 minutes after `createdAt`.
otpVerificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });
const OtpVerification = mongoose.model(
  "OtpVerification",
  otpVerificationSchema,
);

export default OtpVerification;
