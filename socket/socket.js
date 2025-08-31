const io = require("socket.io")(8000, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Log server startup
console.log("🚀 Socket.IO server starting on port 8000");

// Global variables for tracking users and calls
let activeUsers = [];
let activeCalls = new Map(); // Track active calls

// Helper functions
const getUser = (userId) => {
  return activeUsers.find((user) => user.userId === userId);
};

const getActiveCall = (userId) => {
  return activeCalls.get(userId);
};

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);
  console.log("📊 Total active connections:", io.engine.clientsCount);

  // Add user to socket
  socket.on("addUser", (userId, user) => {
    console.log("🔄 Adding user:", userId, "Socket:", socket.id);
    console.log("👤 User data:", user);

    // Check if user already exists
    const existingUserIndex = activeUsers.findIndex((u) => u.userId === userId);

    if (existingUserIndex === -1) {
      // New user
      activeUsers.push({
        userId,
        socketId: socket.id,
        authUser: user,
      });
      console.log("✅ New user added to active users");
    } else {
      // Update existing user's socket ID
      activeUsers[existingUserIndex].socketId = socket.id;
      console.log("✅ Existing user socket ID updated");
    }

    console.log("📊 Active users count:", activeUsers.length);
    console.log(
      "📋 Active users:",
      activeUsers.map((u) => ({ userId: u.userId, socketId: u.socketId }))
    );

    // Emit updated users list to all clients
    io.emit("getUsers", activeUsers);

    // Also emit confirmation to the specific user
    socket.emit("userAdded", {
      userId,
      socketId: socket.id,
      message: "User successfully added to socket server",
      activeUsersCount: activeUsers.length,
    });
  });

  // Handle sending messages
  socket.on("sendMessage", (data) => {
    console.log("📨 Message received:", data);
    const receiver = getUser(data.receiverId);

    if (receiver) {
      console.log("📤 Sending message to:", data.receiverId);
      io.to(receiver.socketId).emit("getMessage", data);
    } else {
      console.log("❌ Receiver not found:", data.receiverId);
    }
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    const receiver = getUser(data.receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit("userTyping", data);
    }
  });

  socket.on("stopTyping", (data) => {
    const receiver = getUser(data.receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit("userStopTyping", data);
    }
  });

  // Handle initiate call
  socket.on("initiateCall", (data) => {
    console.log("📞 Initiate call received:", data);

    // Use the room name provided by the client (from saga)
    const roomName = data.roomName;
    if (!roomName) {
      console.error("❌ No room name provided for call");
      return;
    }

    const receiver = getUser(data.receiverId);
    if (receiver) {
      console.log("📤 Sending incoming call to:", data.receiverId);
      console.log("🏠 Room name:", roomName);

      // Store call data
      const callData = {
        callId: data.callId,
        callerId: data.callerId,
        receiverId: data.receiverId,
        callType: data.callType,
        status: "ringing",
        startTime: Date.now(),
        roomName: roomName,
        platform: "webrtc",
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
      };

      activeCalls.set(data.callId, callData);
      console.log("💾 Call data stored:", callData);

      io.to(receiver.socketId).emit("incomingCall", callData);
    } else {
      console.log("❌ Receiver not found:", data.receiverId);
    }
  });

  // Handle socket disconnection
  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", socket.id, "Reason:", reason);

    // Remove user from active users
    const userIndex = activeUsers.findIndex((u) => u.socketId === socket.id);
    if (userIndex !== -1) {
      const disconnectedUser = activeUsers[userIndex];
      console.log("👤 User disconnected:", disconnectedUser.userId);
      activeUsers.splice(userIndex, 1);

      // Clean up any active calls for this user
      const userCalls = Array.from(activeCalls.entries())
        .filter(([userId, callData]) => userId === disconnectedUser.userId)
        .map(([userId, callData]) => callData);

      userCalls.forEach((callData) => {
        console.log(
          "🧹 Cleaning up call for disconnected user:",
          callData.callId
        );
        activeCalls.delete(callData.callerId);
        activeCalls.delete(callData.receiverId);

        // Notify the other party that the call ended
        const otherUserId =
          callData.callerId === disconnectedUser.userId
            ? callData.receiverId
            : callData.callerId;
        const otherUser = getUser(otherUserId);
        if (otherUser) {
          io.to(otherUser.socketId).emit("callEnded", {
            ...callData,
            reason: "User disconnected",
          });
        }
      });

      console.log("📊 Active users after cleanup:", activeUsers.length);
      console.log("📊 Active calls after cleanup:", activeCalls.size);
    }
  });

  // Handle call acceptance (supports both platforms)
  socket.on("acceptCall", (data) => {
    console.log("📞 Call accepted:", data);
    const caller = getUser(data.callerId);
    const receiver = getUser(data.receiverId);

    if (caller && receiver) {
      let callData =
        getActiveCall(data.callerId) || getActiveCall(data.receiverId);

      if (callData) {
        callData.status = "active";
        callData.answerTime = Date.now();

        console.log("✅ Call status updated to active");
        console.log("✅ Call platform:", callData.platform);

        // Notify caller that call was accepted
        const callerSocket = io.sockets.sockets.get(caller.socketId);
        if (callerSocket) {
          callerSocket.emit("callAccepted", {
            ...data,
            receiverSocketId: receiver.socketId,
            callId: callData.callId,
            roomName: callData.roomName,
            platform: callData.platform,
          });
          console.log("✅ callAccepted sent to caller");
        }

        // Notify receiver that call is now active
        const receiverSocket = io.sockets.sockets.get(receiver.socketId);
        if (receiverSocket) {
          receiverSocket.emit("callConnected", {
            ...callData,
            callerSocketId: caller.socketId,
            platform: callData.platform,
          });
          console.log("✅ callConnected sent to receiver");
        }

        console.log("✅ Call accepted and connected successfully");
      } else {
        console.log("❌ No call data found, creating new call data");
        // Create a new call data if none exists
        const newCallData = {
          callId: `${data.callerId}-${data.receiverId}-${Date.now()}`,
          callerId: data.callerId,
          receiverId: data.receiverId,
          callType: data.callType,
          status: "active",
          startTime: Date.now(),
          answerTime: Date.now(),
          roomName: data.roomName, // Use the room name provided by the client
          platform: "webrtc",
        };

        activeCalls.set(data.callerId, newCallData);
        activeCalls.set(data.receiverId, newCallData);

        console.log("✅ New call data created:", newCallData);

        // Notify both parties
        const callerSocket = io.sockets.sockets.get(caller.socketId);
        if (callerSocket) {
          callerSocket.emit("callAccepted", {
            ...data,
            receiverSocketId: receiver.socketId,
            callId: newCallData.callId,
            roomName: newCallData.roomName,
            platform: newCallData.platform,
          });
        }

        const receiverSocket = io.sockets.sockets.get(receiver.socketId);
        if (receiverSocket) {
          receiverSocket.emit("callConnected", {
            ...newCallData,
            callerSocketId: caller.socketId,
            platform: newCallData.platform,
          });
        }
      }
    } else {
      if (!caller) {
        console.log("❌ Caller not found:", data.callerId);
      }
      if (!receiver) {
        console.log("❌ Receiver not found:", data.receiverId);
      }
      console.log("❌ Cannot accept call - users not found in active users");
    }
  });

  // Handle call decline
  socket.on("declineCall", (data) => {
    console.log("❌ Call declined:", data);
    const caller = getUser(data.callerId);

    if (caller) {
      // Clean up call data
      activeCalls.delete(data.callerId);
      activeCalls.delete(data.receiverId);

      io.to(caller.socketId).emit("callDeclined", {
        ...data,
        receiverSocketId: socket.id,
      });
    }
  });

  // Handle call ending
  socket.on("endCall", (data) => {
    console.log("🔚 Call ended:", data);
    const caller = getUser(data.callerId);
    const receiver = getUser(data.receiverId);

    if (caller && receiver) {
      // Clean up call data
      activeCalls.delete(data.callerId);
      activeCalls.delete(data.receiverId);

      // Find the other party
      const currentUser = activeUsers.find((u) => u.socketId === socket.id);
      const currentUserId = currentUser ? currentUser.userId : null;

      if (currentUserId) {
        const otherUser = currentUserId === data.callerId ? receiver : caller;
        if (otherUser) {
          io.to(otherUser.socketId).emit("callEnded", {
            ...data,
            enderSocketId: socket.id,
            enderId: currentUserId,
            reason: "Call ended by other party",
            platform: data.platform,
          });
        }
      }
    }
  });

  // Handle WebRTC meeting join notification
  socket.on("joinMeeting", (data) => {
    console.log("🔄 User joining WebRTC meeting:", data);
    const { roomName, userId, displayName } = data;

    // Notify other participants in the same room
    const callData = getActiveCall(userId);
    if (callData) {
      const otherUserId =
        callData.callerId === userId ? callData.receiverId : callData.callerId;
      const otherUser = getUser(otherUserId);

      if (otherUser) {
        io.to(otherUser.socketId).emit("participantJoined", {
          roomName,
          userId,
          displayName,
          platform: "webrtc",
        });
      }
    }
  });

  // Handle WebRTC meeting leave notification
  socket.on("leaveMeeting", (data) => {
    console.log("🔄 User leaving WebRTC meeting:", data);
    const { roomName, userId } = data;

    // Notify other participants in the same room
    const callData = getActiveCall(userId);
    if (callData) {
      const otherUserId =
        callData.callerId === userId ? callData.receiverId : callData.callerId;
      const otherUser = getUser(otherUserId);

      if (otherUser) {
        io.to(otherUser.socketId).emit("participantLeft", {
          roomName,
          userId,
          platform: "webrtc",
        });
      }
    }
  });

  // Handle platform switching
  socket.on("switchPlatform", (data) => {
    console.log("🔄 Platform switch requested:", data);
    const { callId, newPlatform, userId } = data;

    // Find the call
    const callData = getActiveCall(userId);
    if (callData && callData.callId === callId) {
      // Update platform
      callData.platform = newPlatform;

      // Notify both parties about platform change
      const caller = getUser(callData.callerId);
      const receiver = getUser(callData.receiverId);

      if (caller) {
        io.to(caller.socketId).emit("platformChanged", {
          callId,
          newPlatform,
          reason: "Platform switched by user",
        });
      }

      if (receiver) {
        io.to(receiver.socketId).emit("platformChanged", {
          callId,
          newPlatform,
          reason: "Platform switched by user",
        });
      }

      console.log(`✅ Platform switched to ${newPlatform} for call ${callId}`);
    }
  });

  // Handle WebRTC signaling (for fallback)
  socket.on("offer", (data) => {
    console.log("🎯 WebRTC offer received:", data);
    const receiver = getUser(data.receiverId);

    if (receiver) {
      io.to(receiver.socketId).emit("offer", {
        ...data,
        senderSocketId: socket.id,
      });
    }
  });

  socket.on("answer", (data) => {
    console.log("🎯 WebRTC answer received:", data);
    const receiver = getUser(data.receiverId);

    if (receiver) {
      io.to(receiver.socketId).emit("answer", {
        ...data,
        senderSocketId: socket.id,
      });
    }
  });

  socket.on("iceCandidate", (data) => {
    console.log("🧊 ICE candidate received:", data);
    const receiver = getUser(data.receiverId);

    if (receiver) {
      io.to(receiver.socketId).emit("iceCandidate", {
        ...data,
        senderSocketId: socket.id,
      });
    }
  });

  // WebRTC Signaling Events
  socket.on("webrtc-offer", (data) => {
    console.log("📡 WebRTC Offer received:", data);
    const { targetUserId, offer, roomName } = data;

    // Forward the offer to the target user
    const targetSocket = getUser(targetUserId);
    if (targetSocket) {
      targetSocket.emit("webrtc-offer", {
        fromUserId: socket.userId,
        offer,
        roomName,
      });
      console.log("✅ WebRTC Offer forwarded to:", targetUserId);
    } else {
      console.log("❌ Target user not found for WebRTC offer:", targetUserId);
    }
  });

  socket.on("webrtc-answer", (data) => {
    console.log("📡 WebRTC Answer received:", data);
    const { targetUserId, answer, roomName } = data;

    // Forward the answer to the target user
    const targetSocket = getUser(targetUserId);
    if (targetSocket) {
      targetSocket.emit("webrtc-answer", {
        fromUserId: socket.userId,
        answer,
        roomName,
      });
      console.log("✅ WebRTC Answer forwarded to:", targetUserId);
    } else {
      console.log("❌ Target user not found for WebRTC answer:", targetUserId);
    }
  });

  socket.on("webrtc-ice-candidate", (data) => {
    console.log("📡 WebRTC ICE Candidate received:", data);
    const { targetUserId, candidate, roomName } = data;

    // Forward the ICE candidate to the target user
    const targetSocket = getUser(targetUserId);
    if (targetSocket) {
      targetSocket.emit("webrtc-ice-candidate", {
        fromUserId: socket.userId,
        candidate,
        roomName,
      });
      console.log("✅ WebRTC ICE Candidate forwarded to:", targetUserId);
    } else {
      console.log(
        "❌ Target user not found for WebRTC ICE candidate:",
        targetUserId
      );
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("🔌 Socket disconnected:", socket.id);

    // Clean up any active calls for this user
    const userId = activeUsers.find((u) => u.socketId === socket.id)?.userId;

    if (userId) {
      const callData = getActiveCall(userId);
      if (callData) {
        // Notify other user that call ended due to disconnection
        const otherUserId =
          callData.callerId === userId
            ? callData.receiverId
            : callData.callerId;
        const otherUser = getUser(otherUserId);
        if (otherUser) {
          io.to(otherUser.socketId).emit("callEnded", {
            reason: "User disconnected",
            otherUserId: userId,
            enderId: userId,
            callType: callData.callType,
            platform: callData.platform,
          });
        }

        // Clean up call data
        activeCalls.delete(callData.callerId);
        activeCalls.delete(callData.receiverId);
      }
    }

    // Remove user from active users
    activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
    io.emit("getUsers", activeUsers);

    console.log("📊 Active users after disconnect:", activeUsers.length);
  });

  // Handle call type change (e.g., video -> audio fallback)
  socket.on("callTypeChanged", (data) => {
    console.log("🔄 Call type changed:", data);
    const { callId, newCallType, reason } = data;

    // Find the call and update it
    for (const [userId, callData] of activeCalls.entries()) {
      if (callData.callId === callId) {
        callData.callType = newCallType;

        // Notify both parties
        const caller = getUser(callData.callerId);
        const receiver = getUser(callData.receiverId);

        if (caller) {
          io.to(caller.socketId).emit("callTypeChanged", {
            callId,
            newCallType,
            reason,
          });
        }

        if (receiver) {
          io.to(receiver.socketId).emit("callTypeChanged", {
            callId,
            newCallType,
            reason,
          });
        }

        console.log(
          `✅ Call type updated to ${newCallType} for call ${callId}`
        );
        break;
      }
    }
  });
});

// Export for potential use in other modules
module.exports = io;
