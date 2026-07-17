import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { success, fail } from "../utils/response.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// @route POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return fail(res, 400, "Name, email and password are required");
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return fail(res, 400, "An account with this email already exists");
    }

    // Only allow 'admin' role if explicitly requested - in a real production
    // app this would be locked down further (invite code / manual promotion).
    const user = await User.create({
      name,
      email,
      password,
      role: role === "admin" ? "admin" : "user",
    });

    return success(res, 201, "Registration successful", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    return fail(res, 500, error.message || "Server error during registration");
  }
};

// @route POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return fail(res, 400, "Email and password are required");
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );
    if (!user || !(await user.matchPassword(password))) {
      return fail(res, 401, "Invalid email or password");
    }

    return success(res, 200, "Login successful", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    return fail(res, 500, error.message || "Server error during login");
  }
};

// @route GET /api/auth/me
export const getMe = async (req, res) => {
  return success(res, 200, "Current user fetched", { user: req.user });
};

// @route GET /api/auth/providers (public - users need to pick who to book with)
export const getProviders = async (req, res) => {
  try {
    const providers = await User.find({ role: "admin" }).select("name email");
    return success(res, 200, "Providers fetched", { providers });
  } catch (error) {
    return fail(
      res,
      500,
      error.message || "Server error while fetching providers",
    );
  }
};
