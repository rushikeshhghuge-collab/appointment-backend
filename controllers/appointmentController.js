import Availability from "../models/Availability.js";
import Appointment from "../models/Appointment.js";
import { generateSlots, toMinutes } from "../utils/slotGenerator.js";
import { isOverlapping } from "../utils/overlapCheck.js";
import { success, fail } from "../utils/response.js";

const ACTIVE_STATUSES = ["Pending", "Confirmed"];

// @route POST /api/appointments (logged-in user)
export const createAppointment = async (req, res) => {
  try {
    const { providerId, appointmentDate, startTime, reason } = req.body;

    // STEP 1: required fields
    if (!providerId || !appointmentDate || !startTime) {
      return fail(
        res,
        400,
        "providerId, appointmentDate and startTime are required",
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      return fail(res, 400, "appointmentDate must be in YYYY-MM-DD format");
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
      return fail(res, 400, "startTime must be in HH:mm format");
    }

    // STEP 2: validate appointment date is real
    const dateObj = new Date(`${appointmentDate}T00:00:00.000Z`);
    if (isNaN(dateObj.getTime())) {
      return fail(res, 400, "Invalid appointmentDate");
    }

    // STEP 3: reject past dates (and past times for today)
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (appointmentDate < todayStr) {
      return fail(res, 400, "Cannot book an appointment for a past date");
    }
    if (appointmentDate === todayStr) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (toMinutes(startTime) <= nowMinutes) {
        return fail(
          res,
          400,
          "Cannot book a time slot that has already passed today",
        );
      }
    }

    // STEP 4: find provider's availability for that weekday
    const dayOfWeek = dateObj.getUTCDay();
    const availability = await Availability.findOne({
      providerId,
      dayOfWeek,
      isAvailable: true,
    });
    if (!availability) {
      return fail(res, 400, "Provider is not available on this day");
    }

    // STEP 5: validate requested time falls within working hours AND aligns
    // to a real generated slot (blocks someone POSTing an arbitrary time
    // like 10:07 via Postman)
    const validSlots = generateSlots(
      availability.startTime,
      availability.endTime,
      availability.slotDuration,
    );
    const matchedSlot = validSlots.find((s) => s.startTime === startTime);
    if (!matchedSlot) {
      return fail(
        res,
        400,
        "Requested time is outside provider working hours or not a valid slot",
      );
    }

    // STEP 6: slot end time comes from the matched slot, never trust client-sent endTime
    const endTime = matchedSlot.endTime;

    // STEP 7 & 8: check overlap against existing ACTIVE appointments for this provider/date
    const existingAppointments = await Appointment.find({
      providerId,
      appointmentDate: dateObj,
      status: { $in: ACTIVE_STATUSES },
    });

    const hasConflict = existingAppointments.some((appt) =>
      isOverlapping(startTime, endTime, appt.startTime, appt.endTime),
    );
    if (hasConflict) {
      return fail(res, 409, "Selected appointment slot is no longer available");
    }

    // STEP 9: create the appointment only after every validation passes.
    // The unique partial index on the model is a second safety net in case
    // two requests raced past the check above at the exact same millisecond.
    let appointment;
    try {
      appointment = await Appointment.create({
        userId: req.user._id,
        providerId,
        appointmentDate: dateObj,
        startTime,
        endTime,
        reason: reason || "",
        status: "Pending",
      });
    } catch (err) {
      if (err.code === 11000) {
        return fail(
          res,
          409,
          "Selected appointment slot is no longer available",
        );
      }
      throw err;
    }

    // STEP 10: proper response
    return success(res, 201, "Appointment booked successfully", {
      appointment,
    });
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while booking appointment",
    );
  }
};

// @route GET /api/appointments/my (logged-in user - own appointments only, Rule 9)
export const getMyAppointments = async (req, res) => {
  try {
    // userId comes ONLY from req.user (the token), never from query/body
    const appointments = await Appointment.find({ userId: req.user._id })
      .populate("providerId", "name email")
      .sort("-appointmentDate");
    return success(res, 200, "Your appointments fetched", { appointments });
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while fetching appointments",
    );
  }
};

// @route PUT /api/appointments/:id/cancel (logged-in user - own appointment only)
export const cancelMyAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return fail(res, 404, "Appointment not found");

    if (appointment.userId.toString() !== req.user._id.toString()) {
      return fail(res, 403, "You can only cancel your own appointments");
    }

    if (appointment.status === "Completed") {
      return fail(res, 400, "Completed appointments cannot be cancelled");
    }
    if (appointment.status === "Cancelled") {
      return fail(res, 400, "Appointment is already cancelled");
    }

    appointment.status = "Cancelled";
    await appointment.save();

    return success(res, 200, "Appointment cancelled successfully", {
      appointment,
    });
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while cancelling appointment",
    );
  }
};

// ---------------- ADMIN ----------------

// @route GET /api/appointments (admin - all appointments, with filters)
export const getAllAppointments = async (req, res) => {
  try {
    const { status, date, search } = req.query;
    const filter = { providerId: req.user._id };

    if (status) filter.status = status;
    if (date) filter.appointmentDate = new Date(`${date}T00:00:00.000Z`);

    let query = Appointment.find(filter)
      .populate("userId", "name email")
      .sort("-appointmentDate");

    let appointments = await query;

    if (search) {
      const s = search.toLowerCase();
      appointments = appointments.filter(
        (a) =>
          a.userId?.name?.toLowerCase().includes(s) ||
          a.userId?.email?.toLowerCase().includes(s),
      );
    }

    return success(res, 200, "Appointments fetched", { appointments });
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while fetching appointments",
    );
  }
};

// Controlled status transition map (Rule 10)
const ALLOWED_TRANSITIONS = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

// @route PUT /api/appointments/:id/status (admin only)
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status: nextStatus } = req.body;
    const validStatuses = ["Pending", "Confirmed", "Completed", "Cancelled"];

    if (!nextStatus || !validStatuses.includes(nextStatus)) {
      return fail(res, 400, "A valid status is required");
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return fail(res, 404, "Appointment not found");

    if (appointment.providerId.toString() !== req.user._id.toString()) {
      return fail(res, 403, "You can only manage your own appointments");
    }

    const allowedNext = ALLOWED_TRANSITIONS[appointment.status];
    if (!allowedNext.includes(nextStatus)) {
      return fail(
        res,
        400,
        `Invalid status transition: ${appointment.status} -> ${nextStatus}`,
      );
    }

    appointment.status = nextStatus;
    await appointment.save();

    return success(res, 200, "Appointment status updated", { appointment });
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while updating status",
    );
  }
};
