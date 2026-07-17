import express from "express";
import {
  createAppointment,
  getMyAppointments,
  cancelMyAppointment,
  getAllAppointments,
  updateAppointmentStatus,
} from "../controllers/appointmentController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// User routes
router.post("/", protect, createAppointment);
router.get("/my", protect, getMyAppointments);
router.put("/:id/cancel", protect, cancelMyAppointment);

// Admin routes
router.get("/", protect, authorize("admin"), getAllAppointments);
router.put("/:id/status", protect, authorize("admin"), updateAppointmentStatus);

export default router;
