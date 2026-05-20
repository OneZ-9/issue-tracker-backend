import jwt from "jsonwebtoken";
import User from "../models/user-model";
import handleError from "../utils/handle-error.js";
import { SERVER_SECRET } from "../constants/shared-constants.js";
import { RESPONSE_MESSAGES } from "../constants/response-messages.js";

const resolveUserFromToken = async (userId, res) => {
  const user = await User.findById({ _id: userId })
    .select("role isActive")
    .lean();

  // If user is not found or is deactivated, return null to indicate unauthorized access
  if (!user || !user.isActive) {
    return null;
  }

  return user;
};

const verifyToken = async (req, res, next) => {
  let token = req.header("Authorization");

  if (!token) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.UNAUTHORIZED,
      error: new Error("No token provided"),
    });
  }
  try {
    token = token.split(" ")[1];
    const decoded = jwt.verify(token, SERVER_SECRET);
    const user = await resolveUserFromToken(decoded.userId, res);
    if (!user) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.UNAUTHORIZED,
        error: new Error("Account not found or deactivated"),
      });
    }
    req.userId = decoded.userId;
    req.userRole = user.role;

    return next();
  } catch (error) {
    console.log(error);
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.UNAUTHORIZED,
      error,
    });
  }
};
