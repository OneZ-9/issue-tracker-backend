import { RESPONSE_MESSAGES } from "../constants/response-messages.js";
import Space from "../models/space-model.js";
import handleError from "../utils/handle-error.js";
import handleResponse from "../utils/handle-response.js";

/**
 * Derives a space key from a space name.
 * - Multi-word names: take the first letter of each word (max 6 chars).
 *   e.g. "Sample App" -> "SA", "My Cool Project" -> "MCP"
 * - Single-word names: take the first characters up to the word length, capped at 6 (min 4).
 *   e.g. "Test" -> "TEST" (4), "Track" -> "TRACK" (5), "Tracker" -> "TRACKE" (6)
 * If the generated key already exists, appends an incrementing numeric suffix
 * until a unique key is found.
 */
const generateSpaceKey = async (name) => {
  const words = name.trim().split(/\s+/);

  let base;
  if (words.length >= 2) {
    base = words
      .map((word) => word[0].toUpperCase())
      .join("")
      .slice(0, 6);
  } else {
    base = words[0].slice(0, Math.min(6, words[0].length)).toUpperCase();
  }

  let spaceKey = base;
  let suffix = 1;

  while (await Space.exists({ spaceKey })) {
    suffix++;
    spaceKey = `${base}${suffix}`;
  }

  return spaceKey;
};

export const createSpace = async (req, res) => {
  try {
    const { name, description } = req.body;

    const spaceKey = await generateSpaceKey(name);

    const space = new Space({
      name,
      description: description || "",
      spaceKey,
      owner: req.userId,
    });

    await space.save();

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.SPACE_CREATED,
      data: space,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.SPACE_CREATION_FAILED,
      error,
    });
  }
};

export const getSpaces = async (req, res) => {
  try {
    const spaces = await Space.find({ isDeleted: false })
      .populate("owner", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.SPACES_FETCH_SUCCESS,
      data: spaces,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.SPACES_FETCH_FAILED,
      error,
    });
  }
};

export const getSpaceById = async (req, res) => {
  try {
    const space = await Space.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate("owner", "name email")
      .lean();

    if (!space) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.SPACE_NOT_FOUND,
        error: new Error("Space not found or has been deleted"),
      });
    }

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.SPACE_FETCH_SUCCESS,
      data: space,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.SPACE_FETCH_FAILED,
      error,
    });
  }
};

export const updateSpace = async (req, res) => {
  try {
    const { name, description } = req.body;

    const space = await Space.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!space) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.SPACE_NOT_FOUND,
        error: new Error("Space not found or has been deleted"),
      });
    }

    // Only the space owner can update it
    if (space.owner.toString() !== req.userId.toString()) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.FORBIDDEN,
        error: new Error("Only the space owner can update this space"),
      });
    }

    if (name !== undefined) space.name = name;
    if (description !== undefined) space.description = description;

    await space.save();

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.SPACE_UPDATE_SUCCESS,
      data: space,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.SPACE_UPDATE_FAILED,
      error,
    });
  }
};

export const deleteSpace = async (req, res) => {
  try {
    const space = await Space.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!space) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.SPACE_NOT_FOUND,
        error: new Error("Space not found or already deleted"),
      });
    }

    // Only the space owner can delete it
    if (space.owner.toString() !== req.userId.toString()) {
      return handleError({
        res,
        metaData: RESPONSE_MESSAGES.FORBIDDEN,
        error: new Error("Only the space owner can delete this space"),
      });
    }

    space.isDeleted = true;
    space.deletedAt = new Date();
    await space.save();

    return handleResponse({
      res,
      metaData: RESPONSE_MESSAGES.SPACE_DELETION_SUCCESS,
      data: null,
    });
  } catch (error) {
    return handleError({
      res,
      metaData: RESPONSE_MESSAGES.SPACE_DELETION_FAILED,
      error,
    });
  }
};
