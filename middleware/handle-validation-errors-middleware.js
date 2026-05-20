import { validationResult } from "express-validator";
import handleError from "../utils/handle-error.js";

const handleRequestParamValidationErrors = (responseMessage) => {
  return async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return handleError({
        res,
        metaData: responseMessage,
        error: new Error(
          `Validation errors: ${errors
            .array()
            .map((error) => `${error.path} - ${error.msg}`)
            .join(",")}`,
        ),
      });
    } else {
      return next();
    }
  };
};

export default handleRequestParamValidationErrors;
