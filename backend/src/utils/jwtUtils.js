import jwt from "jsonwebtoken";

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @param {string} role - User role
 * @returns {string} JWT token
 */
export const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid token");
  }
};

/**
 * Send token response with cookie
 * @param {Object} res - Express response object
 * @param {Object} user - User object
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Response with token
 */
export const sendTokenResponse = (res, user, statusCode = 200) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  // Secure cookie in production
  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  // Remove password from response
  user.password = undefined;

  return res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    user,
  });
};
