import Availability from "../models/Availability.js";
import { success, fail } from "../utils/response.js";

const timeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// @route POST /api/availability (admin only)
export const createAvailability = async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, slotDuration, isAvailable } =
      req.body;

    if (dayOfWeek === undefined || !startTime || !endTime || !slotDuration) {
      return fail(
        res,
        400,
        "dayOfWeek, startTime, endTime and slotDuration are required",
      );
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return fail(
        res,
        400,
        "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)",
      );
    }

    if (slotDuration <= 0) {
      return fail(res, 400, "slotDuration must be greater than zero");
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      return fail(res, 400, "startTime must be before endTime");
    }

    const availability = await Availability.create({
      providerId: req.user._id,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
    });

    return success(res, 201, "Availability created successfully", {
      availability,
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(
        res,
        400,
        "Availability for this day already exists. Update it instead.",
      );
    }
    return fail(
      res,
      500,
      error.message || "Server error while creating availability",
    );
  }
};

// @route GET /api/availability (admin - own availability)
export const getMyAvailability = async (req, res) => {
  try {
    const availability = await Availability.find({
      providerId: req.user._id,
    }).sort("dayOfWeek");
    return success(res, 200, "Availability fetched", { availability });
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while fetching availability",
    );
  }
};

// @route GET /api/availability/:providerId (public - users need this to know which days are open)
export const getProviderAvailability = async (req, res) => {
  try {
    const availability = await Availability.find({
      providerId: req.params.providerId,
      isAvailable: true,
    }).sort("dayOfWeek");
    return success(res, 200, "Provider availability fetched", { availability });
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while fetching availability",
    );
  }
};

// @route PUT /api/availability/:id (admin only, must own it)
export const updateAvailability = async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.id);
    if (!availability) return fail(res, 404, "Availability not found");

    if (availability.providerId.toString() !== req.user._id.toString()) {
      return fail(res, 403, "You can only edit your own availability");
    }

    const { startTime, endTime, slotDuration, isAvailable } = req.body;

    const nextStart = startTime || availability.startTime;
    const nextEnd = endTime || availability.endTime;

    if (timeToMinutes(nextStart) >= timeToMinutes(nextEnd)) {
      return fail(res, 400, "startTime must be before endTime");
    }

    if (slotDuration !== undefined && slotDuration <= 0) {
      return fail(res, 400, "slotDuration must be greater than zero");
    }

    availability.startTime = nextStart;
    availability.endTime = nextEnd;
    if (slotDuration !== undefined) availability.slotDuration = slotDuration;
    if (isAvailable !== undefined) availability.isAvailable = isAvailable;

    await availability.save();

    return success(res, 200, "Availability updated successfully", {
      availability,
    });
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while updating availability",
    );
  }
};

// @route DELETE /api/availability/:id (admin only, must own it)
export const deleteAvailability = async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.id);
    if (!availability) return fail(res, 404, "Availability not found");

    if (availability.providerId.toString() !== req.user._id.toString()) {
      return fail(res, 403, "You can only delete your own availability");
    }

    await availability.deleteOne();
    return success(res, 200, "Availability deleted successfully");
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while deleting availability",
    );
  }
};
