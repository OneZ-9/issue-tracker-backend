import { Router } from "express";
import {
  createSpace,
  deleteSpace,
  getSpaceById,
  getSpaces,
  updateSpace,
} from "../controllers/space-controller.js";
import verifyToken from "../middleware/auth-middleware.js";
import handleRequestParamValidationErrors from "../middleware/handle-validation-errors-middleware.js";
import { RESPONSE_MESSAGES } from "../constants/response-messages.js";
import {
  createSpaceValidationRules,
  updateSpaceValidationRules,
} from "../validators/space-validators.js";

const spaceRoutes = Router();

// All space routes require authentication
spaceRoutes.use(verifyToken);

spaceRoutes.post(
  "/",
  createSpaceValidationRules,
  handleRequestParamValidationErrors(RESPONSE_MESSAGES.SPACE_CREATION_FAILED),
  createSpace,
);

spaceRoutes.get("/", getSpaces);

spaceRoutes.get("/:id", getSpaceById);

spaceRoutes.patch(
  "/:id",
  updateSpaceValidationRules,
  handleRequestParamValidationErrors(RESPONSE_MESSAGES.SPACE_UPDATE_FAILED),
  updateSpace,
);

spaceRoutes.delete("/:id", deleteSpace);

export default spaceRoutes;
