import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Stored as a Date at UTC midnight representing the calendar date only
    appointmentDate: {
      type: Date,
      required: [true, "Appointment date is required"],
    },
    startTime: {
      type: String, // "HH:mm"
      required: true,
    },
    endTime: {
      type: String, // "HH:mm"
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

// Speeds up the "find conflicting appointments for this provider/date" query
appointmentSchema.index({ providerId: 1, appointmentDate: 1, status: 1 });

// Extra safety net: stops the exact same provider+date+startTime combo from
// being inserted twice while both appointments are "active" (Pending/Confirmed).
// This is a backstop for race conditions - the real conflict/overlap logic
// still happens in the controller BEFORE we ever try to insert.
appointmentSchema.index(
  { providerId: 1, appointmentDate: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["Pending", "Confirmed"] } },
  },
);

export default mongoose.model("Appointment", appointmentSchema);
