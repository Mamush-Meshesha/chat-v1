import express from "express";
import { generateJWT } from "../utils/jaasJWT.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// JaaS configuration - you should move these to environment variables
const JAAS_APP_ID = process.env.JAAS_APP_ID || "your-app-id";
const JAAS_KID = process.env.JAAS_KID || "your-key-id";
const JAAS_PRIVATE_KEY =
  process.env.JAAS_PRIVATE_KEY ||
  `-----BEGIN PRIVATE KEY-----
your-private-key-here
-----END PRIVATE KEY-----`;

// Generate JaaS JWT for video calls
router.post("/generate-jwt", protect, async (req, res) => {
  try {
    const { roomName } = req.body;

    if (!roomName) {
      return res.status(400).json({
        success: false,
        message: "Room name is required",
      });
    }

    // Get user data from the authenticated user
    const userData = {
      _id: req.user._id,
      name: req.user.name || req.user.username,
      email: req.user.email,
      avatar: req.user.avatar,
    };

    // Generate JWT token
    const token = generateJWT(
      userData,
      JAAS_APP_ID,
      JAAS_KID,
      JAAS_PRIVATE_KEY
    );

    res.json({
      success: true,
      token,
      appId: JAAS_APP_ID,
      roomName,
    });
  } catch (error) {
    console.error("Error generating JaaS JWT:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate JWT token",
    });
  }
});

export default router;
