import { Router } from "express";
import { createUser } from "../controllers/user-controller.js";
import handleRequestParamValidationErrors from "../middleware/handle-validation-errors-middleware.js";
import { RESPONSE_MESSAGES } from "../constants/response-messages.js";
import {
  createUserValidationRules,
  userSignInValidationRules,
} from "../validators/user-validators.js";

const userRoutes = Router();

userRoutes.post(
  "/",
  createUserValidationRules,
  handleRequestParamValidationErrors(RESPONSE_MESSAGES.USER_CREATION_FAILED),
  createUser,
);

// userRoutes.post("/sign-in", userSignInValidationRules, signIn);

export default userRoutes;
