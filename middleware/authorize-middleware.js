import { RESPONSE_MESSAGES } from "../constants/response-messages.js";
import handleError from "../utils/handle-error.js";

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (req.userId && allowedRoles.includes(req.userRole)) {
      return next();
    }
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.FORBIDDEN,
      error: new Error("Forbidden"),
    });
  };
};
export default authorize;
