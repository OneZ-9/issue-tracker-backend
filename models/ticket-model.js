import mongoose from "mongoose";
import {
  TICKET_PRIORITY,
  TICKET_SEVERITY,
  TICKET_STATUS,
} from "../constants/ticket-constants.js";

const ticketSchema = new mongoose.Schema(
  {
    // Human-readable unique ID, e.g. "SA-1", "SA-2"
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    // Numeric part of the ticketId — stored separately for correct numeric sorting
    // (prevents "SA-10" sorting before "SA-2" in lexicographic order)
    ticketNum: {
      type: Number,
      required: true,
    },
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(TICKET_STATUS),
      default: TICKET_STATUS.OPEN,
    },
    priority: {
      type: String,
      enum: Object.values(TICKET_PRIORITY),
      default: TICKET_PRIORITY.MEDIUM,
    },
    severity: {
      type: String,
      enum: Object.values(TICKET_SEVERITY),
      default: TICKET_SEVERITY.MEDIUM,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Full-text search on title and description
ticketSchema.index({ title: "text", description: "text" });

// Compound indexes for the most common query patterns
ticketSchema.index({ space: 1, isDeleted: 1, ticketNum: 1 });
ticketSchema.index({ space: 1, status: 1, isDeleted: 1 });
ticketSchema.index({ space: 1, priority: 1, isDeleted: 1 });
ticketSchema.index({ assignee: 1, isDeleted: 1 });

const Ticket = mongoose.model("Ticket", ticketSchema);
export default Ticket;
