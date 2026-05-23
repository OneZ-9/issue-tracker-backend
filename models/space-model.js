import mongoose from "mongoose";

const spaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Auto-generated from space name initials (e.g., "Sample App" -> "SA")
    // Used as the prefix for ticket IDs (SA-1, SA-2, ...)
    spaceKey: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Monotonically increasing counter used to generate unique ticket numbers.
    // Never decremented — ensures deleted tickets don't recycle IDs.
    ticketCounter: {
      type: Number,
      default: 0,
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

spaceSchema.index({ spaceKey: 1 }, { unique: true });
spaceSchema.index({ owner: 1 });
spaceSchema.index({ isDeleted: 1 });

const Space = mongoose.model("Space", spaceSchema);
export default Space;
