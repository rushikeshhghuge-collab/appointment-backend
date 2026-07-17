import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
  getProviders,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.get("/providers", getProviders);

export default router;
