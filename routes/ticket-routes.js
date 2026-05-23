import { Router } from "express";
import {
  createTicket,
  deleteTicket,
  exportTickets,
  getTicketById,
  getTicketStats,
  getTickets,
  updateTicket,
  updateTicketStatus,
} from "../controllers/ticket-controller.js";
import verifyToken from "../middleware/auth-middleware.js";
import handleRequestParamValidationErrors from "../middleware/handle-validation-errors-middleware.js";
import { RESPONSE_MESSAGES } from "../constants/response-messages.js";
import {
  createTicketValidationRules,
  listTicketsQueryValidationRules,
  updateTicketStatusValidationRules,
  updateTicketValidationRules,
} from "../validators/ticket-validators.js";

// mergeParams: true allows access to :spaceId from the parent router
const ticketRoutes = Router({ mergeParams: true });

// All ticket routes require authentication
ticketRoutes.use(verifyToken);

ticketRoutes.get("/stats", getTicketStats);
ticketRoutes.get("/export", exportTickets);

ticketRoutes.post(
  "/",
  createTicketValidationRules,
  handleRequestParamValidationErrors(RESPONSE_MESSAGES.TICKET_CREATION_FAILED),
  createTicket,
);

ticketRoutes.get(
  "/",
  listTicketsQueryValidationRules,
  handleRequestParamValidationErrors(RESPONSE_MESSAGES.TICKETS_FETCH_FAILED),
  getTickets,
);

ticketRoutes.get("/:ticketId", getTicketById);

ticketRoutes.patch(
  "/:ticketId",
  updateTicketValidationRules,
  handleRequestParamValidationErrors(RESPONSE_MESSAGES.TICKET_UPDATE_FAILED),
  updateTicket,
);

ticketRoutes.patch(
  "/:ticketId/status",
  updateTicketStatusValidationRules,
  handleRequestParamValidationErrors(RESPONSE_MESSAGES.TICKET_UPDATE_FAILED),
  updateTicketStatus,
);

ticketRoutes.delete("/:ticketId", deleteTicket);

export default ticketRoutes;
