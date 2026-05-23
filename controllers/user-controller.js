import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  REFRESH_TOKEN_SECRET,
  SERVER_SECRET,
} from "../constants/shared-constants.js";
import { verifyOtp } from "./otp-controller.js";
import { RESPONSE_MESSAGES } from "../constants/response-messages.js";
import User from "../models/user-model.js";
import handleError from "../utils/handle-error.js";
import handleResponse from "../utils/handle-response.js";

const generateAccessToken = (user) => {
  const token = jwt.sign({ userId: user._id }, SERVER_SECRET, {
    expiresIn: "1h", // Access token expiration
  });
  return token;
};

const generateRefreshToken = (user) => {
  const refreshToken = jwt.sign(
    { userId: user._id },
    REFRESH_TOKEN_SECRET, // Different secret for refresh tokens
    {
      expiresIn: "30d", // Refresh token expiration
    },
  );

  return refreshToken;
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, isActive, otp } = req.body;

    const isOtpVerified = await verifyOtp({ otp, email });

    if (isOtpVerified === false) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.OTP_VERIFICATION_FAILED,
        error: new Error("Invalid or expired OTP code"),
      });
    }

    const isEmailExists = await User.findOne({ email: email });
    if (isEmailExists) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.EMAIL_ALREADY_EXISTS,
        error: new Error("Validation errors: Email already exists"),
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      isActive: isActive !== undefined ? isActive : true,
    });

    await user.save();

    const token = generateAccessToken(user);

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.USER_CREATED,
      data: { ...user._doc, password: undefined, token },
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.USER_CREATION_FAILED,
      error,
    });
  }
};

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.USER_NOT_FOUND,
        error: new Error("Username or password is incorrect"),
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.USER_LOGIN_FAILED,
        error: new Error("Username or password is incorrect"),
      });
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.USER_LOGIN_SUCCESS,
      data: { ...user._doc, password: undefined, token, refreshToken },
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.USER_LOGIN_FAILED,
      error,
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    let token = req.header("Refresh-Token");
    if (!token) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.UNAUTHORIZED,
        error: new Error("No refresh token provided"),
      });
    }

    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.userId).select("-password").lean();

    if (!user || !user.isActive) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.USER_NOT_FOUND,
        error: new Error("User not found or deactivated"),
      });
    }

    const newToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.USER_REFRESH_TOKEN_SUCCESS,
      data: { token: newToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.USER_REFRESH_TOKEN_FAILED,
      error,
    });
  }
};
