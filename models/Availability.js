import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 0 = Sunday, 1 = Monday, ... 6 = Saturday (matches JS Date.getDay())
    dayOfWeek: {
      type: Number,
      required: [true, "Day of week is required"],
      min: 0,
      max: 6,
    },
    // Stored as "HH:mm" 24-hour format, e.g. "09:00"
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "startTime must be in HH:mm format",
      ],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "endTime must be in HH:mm format"],
    },
    slotDuration: {
      type: Number, // in minutes
      required: [true, "Slot duration is required"],
      min: [1, "Slot duration must be greater than zero"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Prevent creating the exact same day rule twice for the same provider
availabilitySchema.index({ providerId: 1, dayOfWeek: 1 }, { unique: true });

export default mongoose.model("Availability", availabilitySchema);
