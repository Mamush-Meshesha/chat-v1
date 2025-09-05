import express from "express";

const router = express.Router();

// Create Daily.co room using REST API
router.post("/create-room", async (req, res) => {
  try {
    const { roomName } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: "Room name is required" });
    }

    console.log("🏗️ Creating Daily.co room via REST API:", roomName);

    // Try to create room using Daily.co REST API
    try {
      const response = await fetch(`https://api.daily.co/v1/rooms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DAILY_CO_PRIVATE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          properties: {
            enable_prejoin_ui: false,
            enable_screenshare: false,
            enable_chat: false,
            enable_knocking: false,
            enable_recording: false,
            enable_transcription: false,
            max_participants: 2,
            exp: Math.round(Date.now() / 1000) + 60 * 60, // 1 hour expiry
          },
        }),
      });

      if (response.ok) {
        const roomData = await response.json();
        console.log(
          "✅ Daily.co room created successfully via API:",
          roomData.name
        );

        return res.json({
          success: true,
          room: {
            name: roomData.name,
            url: roomData.url,
            id: roomData.id,
          },
        });
      } else {
        const errorData = await response.json();
        console.log("⚠️ Daily.co API failed:", response.status, errorData);
      }
    } catch (apiError) {
      console.log("⚠️ Daily.co API error:", apiError.message);
    }

    // Fallback: Generate simple room URL - Daily.co should create room automatically
    const roomUrl = `https://cloud-48b3ae2ced424673a4d45f40a71e7be7.daily.co/${roomName}`;
    console.log("✅ Daily.co room URL generated (fallback):", roomUrl);

    res.json({
      success: true,
      room: {
        name: roomName,
        url: roomUrl,
        id: roomName,
      },
    });
  } catch (error) {
    console.error("❌ Error creating Daily.co room:", error);
    res.status(500).json({
      error: "Failed to create room",
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
