import { Router } from "express";
import { otpValidationRules } from "../validators/otp-validators.js";
import { RESPONSE_MESSAGES } from "../constants/response-messages.js";
import handleRequestParamValidationErrors from "../middleware/handle-validation-errors-middleware.js";
import { sendOtp } from "../controllers/otp-controller.js";

const otpRoutes = Router();

otpRoutes.post(
  "/send-otp",
  otpValidationRules,
  handleRequestParamValidationErrors(RESPONSE_MESSAGES.OTP_SEND_FAILED),
  sendOtp,
);

export default otpRoutes;
