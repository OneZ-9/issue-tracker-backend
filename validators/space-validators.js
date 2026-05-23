import { body } from "express-validator";

export const createSpaceValidationRules = [
  body("name")
    .notEmpty()
    .withMessage("Space name is required")
    .isString()
    .withMessage("Space name must be a string")
    .isLength({ min: 4, max: 100 })
    .withMessage("Space name must be between 4 and 100 characters")
    .trim(),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters")
    .trim(),
];

export const updateSpaceValidationRules = [
  body("name")
    .optional()
    .isString()
    .withMessage("Space name must be a string")
    .isLength({ min: 4, max: 100 })
    .withMessage("Space name must be between 4 and 100 characters")
    .trim(),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters")
    .trim(),
];
