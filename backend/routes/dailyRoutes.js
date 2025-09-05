import express from "express";

const router = express.Router();

// Generate Daily.co room URL with instant creation
router.post("/create-room", async (req, res) => {
  try {
    const { roomName } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: "Room name is required" });
    }

    console.log("🏗️ Generating Daily.co room URL with instant creation:", roomName);

    // Generate room URL with instant creation parameters
    const roomUrl = `https://cloud-48b3ae2ced424673a4d45f40a71e7be7.daily.co/${roomName}?instant=1&enablePrejoinUI=false&enableScreenshare=false&enableChat=false&enableKnocking=false`;

    console.log("✅ Daily.co room URL generated:", roomUrl);

    res.json({
      success: true,
      room: {
        name: roomName,
        url: roomUrl,
        id: roomName,
      },
    });
  } catch (error) {
    console.error("❌ Error generating Daily.co room URL:", error);
    res.status(500).json({
      error: "Failed to generate room URL",
      details: error.message,
    });
  }
});

// Get room info (simple response)
router.get("/room/:roomName", async (req, res) => {
  try {
    const { roomName } = req.params;

    console.log("🔍 Getting Daily.co room info:", roomName);

    const roomUrl = `https://cloud-48b3ae2ced424673a4d45f40a71e7be7.daily.co/${roomName}`;

    res.json({
      success: true,
      room: {
        name: roomName,
        url: roomUrl,
        id: roomName,
      },
    });
  } catch (error) {
    console.error("❌ Error getting room info:", error);
    res.status(500).json({
      error: "Failed to get room info",
      details: error.message,
    });
  }
});

export default router;
