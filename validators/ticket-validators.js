import { body, query } from "express-validator";
import {
  TICKET_PRIORITY,
  TICKET_SEVERITY,
  TICKET_STATUS,
} from "../constants/ticket-constants.js";

export const createTicketValidationRules = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters")
    .trim(),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 5000 })
    .withMessage("Description must not exceed 5000 characters")
    .trim(),
  body("priority")
    .optional()
    .isIn(Object.values(TICKET_PRIORITY))
    .withMessage(
      `Priority must be one of: ${Object.values(TICKET_PRIORITY).join(", ")}`,
    ),
  body("severity")
    .optional()
    .isIn(Object.values(TICKET_SEVERITY))
    .withMessage(
      `Severity must be one of: ${Object.values(TICKET_SEVERITY).join(", ")}`,
    ),
  body("assignee")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Invalid assignee ID"),
];

export const updateTicketValidationRules = [
  body("title")
    .optional()
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters")
    .trim(),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 5000 })
    .withMessage("Description must not exceed 5000 characters")
    .trim(),
  body("priority")
    .optional()
    .isIn(Object.values(TICKET_PRIORITY))
    .withMessage(
      `Priority must be one of: ${Object.values(TICKET_PRIORITY).join(", ")}`,
    ),
  body("severity")
    .optional()
    .isIn(Object.values(TICKET_SEVERITY))
    .withMessage(
      `Severity must be one of: ${Object.values(TICKET_SEVERITY).join(", ")}`,
    ),
  body("assignee")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Invalid assignee ID"),
];

export const updateTicketStatusValidationRules = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(Object.values(TICKET_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(TICKET_STATUS).join(", ")}`,
    ),
];

export const listTicketsQueryValidationRules = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(Object.values(TICKET_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(TICKET_STATUS).join(", ")}`,
    ),
  query("priority")
    .optional()
    .isIn(Object.values(TICKET_PRIORITY))
    .withMessage(
      `Priority must be one of: ${Object.values(TICKET_PRIORITY).join(", ")}`,
    ),
  query("severity")
    .optional()
    .isIn(Object.values(TICKET_SEVERITY))
    .withMessage(
      `Severity must be one of: ${Object.values(TICKET_SEVERITY).join(", ")}`,
    ),
  query("assignee").optional().isMongoId().withMessage("Invalid assignee ID"),
  query("sortBy")
    .optional()
    .isIn(["ticketId", "priority", "createdAt", "updatedAt"])
    .withMessage(
      "sortBy must be one of: ticketId, priority, createdAt, updatedAt",
    ),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),
];

export const exportTicketsValidationRules = [
  // Reuse the list query validators for filters and pagination-like params
  ...listTicketsQueryValidationRules,
  // Export-specific param: format can be json or csv
  query("format")
    .optional()
    .isIn(["json", "csv"])
    .withMessage("format must be 'json' or 'csv'"),
];

export const kanbanQueryValidationRules = [
  // No status, page, limit, or sortBy — kanban always shows all statuses
  query("priority")
    .optional()
    .isIn(Object.values(TICKET_PRIORITY))
    .withMessage(
      `Priority must be one of: ${Object.values(TICKET_PRIORITY).join(", ")}`,
    ),
  query("severity")
    .optional()
    .isIn(Object.values(TICKET_SEVERITY))
    .withMessage(
      `Severity must be one of: ${Object.values(TICKET_SEVERITY).join(", ")}`,
    ),
  query("assignee").optional().isMongoId().withMessage("Invalid assignee ID"),
  query("search").optional().isString().withMessage("search must be a string"),
];
