import Availability from "../models/Availability.js";
import Appointment from "../models/Appointment.js";
import { generateSlots, toMinutes } from "../utils/slotGenerator.js";
import { isOverlapping } from "../utils/overlapCheck.js";
import { success, fail } from "../utils/response.js";

const ACTIVE_STATUSES = ["Pending", "Confirmed"];

// @route GET /api/slots/:providerId?date=YYYY-MM-DD
export const getAvailableSlots = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return fail(
        res,
        400,
        "A valid date query param (YYYY-MM-DD) is required",
      );
    }

    // Build a UTC-midnight Date so day-of-week and DB comparisons are stable
    const requestedDate = new Date(`${date}T00:00:00.000Z`);
    if (isNaN(requestedDate.getTime())) {
      return fail(res, 400, "Invalid date provided");
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (date < todayStr) {
      return fail(res, 400, "Cannot fetch slots for a past date");
    }

    const dayOfWeek = requestedDate.getUTCDay(); // 0-6

    // Step 1: find this provider's availability rule for that weekday
    const availability = await Availability.findOne({
      providerId,
      dayOfWeek,
      isAvailable: true,
    });

    if (!availability) {
      return success(res, 200, "No availability configured for this date", {
        date,
        slots: [],
      });
    }

    // Step 2: dynamically generate every theoretical slot (NOT hardcoded)
    let candidateSlots = generateSlots(
      availability.startTime,
      availability.endTime,
      availability.slotDuration,
    );

    // Step 3: remove past slots if the requested date is today
    if (date === todayStr) {
      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      candidateSlots = candidateSlots.filter(
        (s) => toMinutes(s.startTime) > nowMinutes,
      );
    }

    // Step 4: fetch existing ACTIVE appointments for this provider/date only
    // (Cancelled appointments are excluded here, which is exactly why a
    // cancelled slot becomes bookable again - Rule 7.)
    const existingAppointments = await Appointment.find({
      providerId,
      appointmentDate: requestedDate,
      status: { $in: ACTIVE_STATUSES },
    });

    // Step 5: drop any candidate slot that overlaps an existing appointment
    const availableSlots = candidateSlots.filter((slot) => {
      return !existingAppointments.some((appt) =>
        isOverlapping(
          slot.startTime,
          slot.endTime,
          appt.startTime,
          appt.endTime,
        ),
      );
    });

    return success(res, 200, "Available slots fetched", {
      date,
      slots: availableSlots,
    });
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while generating slots",
    );
  }
};
