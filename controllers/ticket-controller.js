import mongoose from "mongoose";
import { RESPONSE_MESSAGES } from "../constants/response-messages.js";
import {
  PRIORITY_ORDER,
  TICKET_PRIORITY,
  TICKET_SEVERITY,
  TICKET_STATUS,
  VALID_STATUS_TRANSITIONS,
} from "../constants/ticket-constants.js";
import Space from "../models/space-model.js";
import Ticket from "../models/ticket-model.js";
import handleError from "../utils/handle-error.js";
import handleResponse from "../utils/handle-response.js";

/**
 * Builds a MongoDB filter query for ticket listing/export.
 * Handles text search ($text), status, priority, severity, and assignee filters.
 */
const buildFilterQuery = (spaceId, queryParams) => {
  const { status, priority, severity, assignee, search } = queryParams;

  const query = {
    space: new mongoose.Types.ObjectId(spaceId),
    isDeleted: false,
  };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (severity) query.severity = severity;
  if (assignee) query.assignee = new mongoose.Types.ObjectId(assignee);

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ title: regex }, { description: regex }];
  }

  return query;
};

export const createTicket = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { title, description, priority, severity, assignee } = req.body;

    // Atomically increment ticketCounter so concurrent requests never share the same number.
    // The counter never decrements — guarantees SA-3 is never reissued even if SA-2 is deleted.
    const space = await Space.findOneAndUpdate(
      { _id: spaceId, isDeleted: false },
      { $inc: { ticketCounter: 1 } },
      { new: true },
    );

    if (!space) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.SPACE_NOT_FOUND,
        error: new Error("Space not found or has been deleted"),
      });
    }

    const ticketNum = space.ticketCounter;
    const ticketId = `${space.spaceKey}-${ticketNum}`;

    const ticket = new Ticket({
      ticketId,
      ticketNum,
      space: spaceId,
      title,
      description: description || "",
      priority: priority || TICKET_PRIORITY.MEDIUM,
      severity: severity || TICKET_SEVERITY.MEDIUM,
      assignee: assignee || null,
      reporter: req.userId,
    });

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .lean();

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.TICKET_CREATED,
      data: populatedTicket,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.TICKET_CREATION_FAILED,
      error,
    });
  }
};

export const getTickets = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = "ticketId",
      sortOrder = "asc",
      status,
      priority,
      severity,
      assignee,
      search,
    } = req.query;

    const spaceExists = await Space.exists({
      _id: spaceId,
      isDeleted: false,
    });
    if (!spaceExists) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.SPACE_NOT_FOUND,
        error: new Error("Space not found or has been deleted"),
      });
    }

    const matchQuery = buildFilterQuery(spaceId, {
      status,
      priority,
      severity,
      assignee,
      search,
    });

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const sortDir = sortOrder === "desc" ? -1 : 1;

    let tickets;
    let total;

    if (sortBy === "priority") {
      // Priority is a string enum; use aggregation to sort by semantic weight
      // (critical=4, high=3, medium=2, low=1) rather than alphabetically.
      const priorityBranches = Object.entries(PRIORITY_ORDER).map(([k, v]) => ({
        case: { $eq: ["$priority", k] },
        then: v,
      }));

      const pipeline = [
        { $match: matchQuery },
        {
          $addFields: {
            _priorityOrder: {
              $switch: { branches: priorityBranches, default: 0 },
            },
          },
        },
        { $sort: { _priorityOrder: sortDir } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limitNum }],
            count: [{ $count: "total" }],
          },
        },
      ];

      const [result] = await Ticket.aggregate(pipeline);
      tickets = result.data;
      total = result.count[0]?.total ?? 0;

      // Populate refs after aggregation
      await Ticket.populate(tickets, [
        { path: "assignee", select: "name email" },
        { path: "reporter", select: "name email" },
      ]);
    } else {
      // For ticketId sort, use ticketNum (numeric) to avoid lexicographic issues.
      // SA-10 should sort after SA-9, not before SA-2.
      const sortField = sortBy === "ticketId" ? "ticketNum" : sortBy;
      const sort = { [sortField]: sortDir };

      [tickets, total] = await Promise.all([
        Ticket.find(matchQuery)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .populate("assignee", "name email")
          .populate("reporter", "name email")
          .lean(),
        Ticket.countDocuments(matchQuery),
      ]);
    }

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.TICKETS_FETCH_SUCCESS,
      data: {
        tickets,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.TICKETS_FETCH_FAILED,
      error,
    });
  }
};

export const getTicketStats = async (req, res) => {
  try {
    const { spaceId } = req.params;

    const spaceExists = await Space.exists({
      _id: spaceId,
      isDeleted: false,
    });
    if (!spaceExists) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.SPACE_NOT_FOUND,
        error: new Error("Space not found or has been deleted"),
      });
    }

    const statsRaw = await Ticket.aggregate([
      {
        $match: {
          space: new mongoose.Types.ObjectId(spaceId),
          isDeleted: false,
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Ensure all statuses are present in the response even if count is 0
    const stats = Object.values(TICKET_STATUS).reduce((acc, status) => {
      const found = statsRaw.find((s) => s._id === status);
      acc[status] = found ? found.count : 0;
      return acc;
    }, {});

    const total = Object.values(stats).reduce((sum, n) => sum + n, 0);

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.TICKETS_FETCH_SUCCESS,
      data: { ...stats, total },
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.TICKETS_FETCH_FAILED,
      error,
    });
  }
};

export const exportTickets = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const {
      format = "json",
      status,
      priority,
      severity,
      assignee,
      search,
    } = req.query;

    const space = await Space.findOne({
      _id: spaceId,
      isDeleted: false,
    }).lean();

    if (!space) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.SPACE_NOT_FOUND,
        error: new Error("Space not found or has been deleted"),
      });
    }

    const matchQuery = buildFilterQuery(spaceId, {
      status,
      priority,
      severity,
      assignee,
      search,
    });

    const tickets = await Ticket.find(matchQuery)
      .sort({ ticketNum: 1 })
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .lean();

    const filename = `${space.spaceKey}-tickets-${Date.now()}`;

    if (format === "csv") {
      const headers = [
        "Ticket ID",
        "Title",
        "Status",
        "Priority",
        "Severity",
        "Reporter",
        "Assignee",
        "Created At",
        "Updated At",
      ];

      // RFC 4180 compliant CSV field escaping
      const escapeField = (value) => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = tickets.map((t) =>
        [
          escapeField(t.ticketId),
          escapeField(t.title),
          escapeField(t.status),
          escapeField(t.priority),
          escapeField(t.severity),
          escapeField(t.reporter?.name || t.reporter?.email || ""),
          escapeField(t.assignee?.name || t.assignee?.email || "Unassigned"),
          escapeField(new Date(t.createdAt).toISOString()),
          escapeField(new Date(t.updatedAt).toISOString()),
        ].join(","),
      );

      const csvContent = [headers.join(","), ...rows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.csv"`,
      );
      return res.send(csvContent);
    }

    // JSON export
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.json"`,
    );
    return res.json({
      space: space.name,
      exportedAt: new Date().toISOString(),
      total: tickets.length,
      tickets,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.TICKETS_FETCH_FAILED,
      error,
    });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const { spaceId, ticketId } = req.params;

    const ticket = await Ticket.findOne({
      _id: ticketId,
      space: spaceId,
      isDeleted: false,
    })
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate({ path: "space", select: "name spaceKey isDeleted" })
      .lean();

    if (!ticket || ticket.space?.isDeleted) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.TICKET_NOT_FOUND,
        error: new Error("Ticket not found or its space has been deleted"),
      });
    }

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.TICKET_FETCH_SUCCESS,
      data: ticket,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.TICKET_FETCH_FAILED,
      error,
    });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { spaceId, ticketId } = req.params;
    const { title, description, priority, severity, assignee } = req.body;

    const ticket = await Ticket.findOne({
      _id: ticketId,
      space: spaceId,
      isDeleted: false,
    });

    if (!ticket) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.TICKET_NOT_FOUND,
        error: new Error("Ticket not found"),
      });
    }

    // Verify space is still active when modifying ticket
    const spaceExists = await Space.exists({
      _id: spaceId,
      isDeleted: false,
    });
    if (!spaceExists) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.SPACE_NOT_FOUND,
        error: new Error("Space has been deleted"),
      });
    }

    if (title !== undefined) ticket.title = title;
    if (description !== undefined) ticket.description = description;
    if (priority !== undefined) ticket.priority = priority;
    if (severity !== undefined) ticket.severity = severity;
    // Allow unsetting assignee by passing null
    if (assignee !== undefined) ticket.assignee = assignee || null;

    await ticket.save();

    const updated = await Ticket.findById(ticket._id)
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .lean();

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.TICKET_UPDATE_SUCCESS,
      data: updated,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.TICKET_UPDATE_FAILED,
      error,
    });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { spaceId, ticketId } = req.params;
    const { status: newStatus } = req.body;

    const ticket = await Ticket.findOne({
      _id: ticketId,
      space: spaceId,
      isDeleted: false,
    });

    if (!ticket) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.TICKET_NOT_FOUND,
        error: new Error("Ticket not found"),
      });
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[ticket.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.TICKET_UPDATE_FAILED,
        error: new Error(
          `Invalid status transition from "${ticket.status}" to "${newStatus}". Allowed transitions: ${allowedTransitions.join(", ") || "none"}`,
        ),
      });
    }

    ticket.status = newStatus;
    await ticket.save();

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.TICKET_UPDATE_SUCCESS,
      data: ticket,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.TICKET_UPDATE_FAILED,
      error,
    });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const { spaceId, ticketId } = req.params;

    const ticket = await Ticket.findOne({
      _id: ticketId,
      space: spaceId,
      isDeleted: false,
    });

    if (!ticket) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.TICKET_NOT_FOUND,
        error: new Error("Ticket not found or already deleted"),
      });
    }

    ticket.isDeleted = true;
    ticket.deletedAt = new Date();
    await ticket.save();

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.TICKET_DELETION_SUCCESS,
      data: null,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.TICKET_DELETION_FAILED,
      error,
    });
  }
};

export const getKanbanBoard = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { priority, severity, assignee, search } = req.query;

    const spaceExists = await Space.exists({ _id: spaceId, isDeleted: false });
    if (!spaceExists) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.SPACE_NOT_FOUND,
        error: new Error("Space not found or has been deleted"),
      });
    }

    // Base filter — same logic as buildFilterQuery but without status
    const baseFilter = {
      space: new mongoose.Types.ObjectId(spaceId),
      isDeleted: false,
    };

    if (priority) baseFilter.priority = priority;
    if (severity) baseFilter.severity = severity;
    if (assignee) baseFilter.assignee = new mongoose.Types.ObjectId(assignee);
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      baseFilter.$or = [{ title: regex }, { description: regex }];
    }

    // Fetch all three columns in parallel — each is covered by the
    // compound index { space: 1, status: 1, isDeleted: 1 }
    const populate = [
      { path: "assignee", select: "name email" },
      { path: "reporter", select: "name email" },
    ];

    const [openTickets, inProgressTickets, resolvedTickets] = await Promise.all(
      [
        Ticket.find({ ...baseFilter, status: TICKET_STATUS.OPEN })
          .sort({ ticketNum: 1 })
          .populate(populate)
          .lean(),
        Ticket.find({ ...baseFilter, status: TICKET_STATUS.IN_PROGRESS })
          .sort({ ticketNum: 1 })
          .populate(populate)
          .lean(),
        Ticket.find({ ...baseFilter, status: TICKET_STATUS.RESOLVED })
          .sort({ ticketNum: 1 })
          .populate(populate)
          .lean(),
      ],
    );

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.TICKETS_FETCH_SUCCESS,
      data: {
        [TICKET_STATUS.OPEN]: {
          count: openTickets.length,
          tickets: openTickets,
        },
        [TICKET_STATUS.IN_PROGRESS]: {
          count: inProgressTickets.length,
          tickets: inProgressTickets,
        },
        [TICKET_STATUS.RESOLVED]: {
          count: resolvedTickets.length,
          tickets: resolvedTickets,
        },
      },
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.TICKETS_FETCH_FAILED,
      error,
    });
  }
};
