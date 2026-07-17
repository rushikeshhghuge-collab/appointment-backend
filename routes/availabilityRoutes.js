import express from "express";
import {
  createAvailability,
  getMyAvailability,
  getProviderAvailability,
  updateAvailability,
  deleteAvailability,
} from "../controllers/availabilityController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, authorize("admin"), createAvailability);
router.get("/", protect, authorize("admin"), getMyAvailability);
router.get("/:providerId", getProviderAvailability); // public - users browsing need this
router.put("/:id", protect, authorize("admin"), updateAvailability);
router.delete("/:id", protect, authorize("admin"), deleteAvailability);

export default router;
