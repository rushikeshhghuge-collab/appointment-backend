import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { fail } from "../utils/response.js";

// Verifies the JWT and attaches the logged-in user to req.user.
// This is the ONLY source of truth for "who is logged in" -
// we never trust a userId sent from the frontend/body/query.
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return fail(res, 401, "Not authorized, no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return fail(res, 401, "Not authorized, user no longer exists");
    }

    req.user = user; // req.user._id, req.user.role available everywhere downstream
    next();
  } catch (error) {
    return fail(res, 401, "Not authorized, token invalid or expired");
  }
};

// Restricts a route to specific roles, e.g. authorize("admin")
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return fail(res, 403, `Access denied. Requires role: ${roles.join(" or ")}`);
    }
    next();
  };
};
