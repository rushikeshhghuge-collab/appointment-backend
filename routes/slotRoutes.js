import express from "express";
import { getAvailableSlots } from "../controllers/slotController.js";

const router = express.Router();

// Public - a user browsing needs to see slots before logging in/booking
router.get("/:providerId", getAvailableSlots);

export default router;
