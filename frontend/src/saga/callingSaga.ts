import { call, put, takeLatest, select } from "redux-saga/effects";
import { PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { getApiUrl } from "../config/config";
import socketManager from "../services/socketManager";
import {
  initiateCallStart,
  initiateCallSuccess,
  initiateCallFailure,
  acceptCallStart,
  acceptCallSuccess,
  acceptCallFailure,
} from "../slice/callingSlice";
import { RootState } from "../store";

// Helper function to get current user ID from auth state
function* getCurrentUserId(): Generator<any, string | undefined, any> {
  const state: RootState = yield select();
  return state.auth.user?._id;
}

// Helper function to get current user name from auth state
function* getCurrentUserName(): Generator<any, string, any> {
  const state: RootState = yield select();
  return state.auth.user?.name || "User";
}

// Create call record in backend
function* createCallRecord(callData: {
  receiverId: string;
  type: "outgoing" | "incoming";
  callType: "audio" | "video";
  roomName: string;
}): Generator<any, string | null, any> {
  try {
    const authUser = localStorage.getItem("authUser");
    const token = authUser ? JSON.parse(authUser).token : null;

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response: any = yield call(
      axios.post,
      getApiUrl("/api/calls"),
      {
        receiverId: callData.receiverId,
        type: callData.type,
        callType: callData.callType,
        roomName: callData.roomName,
        platform: "jitsi",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.success || response.data._id) {
      return response.data._id || response.data.call?._id;
    } else {
      throw new Error("Failed to create call record");
    }
  } catch (error: any) {
    console.error("Error creating call record:", error);
    return null;
  }
}

// Initiate call saga
function* initiateCallSaga(
  action: PayloadAction<{
    receiverId: string;
    callType: "audio" | "video";
    receiverName: string;
  }>
): Generator<any, void, any> {
  try {
    console.log("🚀 CALLING SAGA: initiateCall started");

    const { receiverId, callType } = action.payload;
    const callerId: string = yield getCurrentUserId();
    const callerName: string = yield getCurrentUserName();

    if (!callerId) {
      throw new Error("User not authenticated");
    }

    // Get room name from state
    const state: RootState = yield select();
    const roomName = state.calling.roomName;

    if (!roomName) {
      throw new Error("Room name not generated");
    }

    console.log("🔍 Call data:", {
      callerId,
      receiverId,
      callType,
      roomName,
      callerName,
    });

    // Create call record in backend
    const callRecordId: string | null = yield call(createCallRecord, {
      receiverId,
      type: "outgoing",
      callType,
      roomName,
    });

    if (!callRecordId) {
      throw new Error("Failed to create call record");
    }

    console.log("✅ Call record created:", callRecordId);

    // Prepare call data
    const callData = {
      callId: callRecordId,
      callerId,
      receiverId,
      callType,
      roomName,
      callerName,
      callerAvatar: "/profile.jpg",
      status: "ringing" as const,
      platform: "jitsi" as const,
    };

    // Get socket
    const socket = socketManager.getSocket();
    if (!socket) {
      throw new Error("Socket not available");
    }

    // Emit initiateCall event
    socket.emit("initiateCall", {
      callerId,
      receiverId,
      callType,
      callId: callRecordId,
      roomName,
      callerName,
      callerAvatar: "/profile.jpg",
    });

    console.log("✅ initiateCall event emitted to socket server");

    // Update state with success
    yield put(initiateCallSuccess(callData));

    console.log("🎯 Call initiated successfully!");
  } catch (error: any) {
    console.error("❌ Error in initiateCall saga:", error);
    yield put(initiateCallFailure(error.message || "Failed to initiate call"));
  }
}

// Accept call saga
function* acceptCallSaga(): Generator<any, void, any> {
  try {
    console.log("🔄 CALLING SAGA: acceptCall started");

    const state: RootState = yield select();
    const incomingCallData = state.calling.incomingCallData;

    if (!incomingCallData) {
      throw new Error("No incoming call data");
    }

    const socket = socketManager.getSocket();
    if (!socket) {
      throw new Error("Socket not available");
    }

    // Emit acceptCall event
    socket.emit("acceptCall", {
      callerId: incomingCallData.callerId,
      receiverId: incomingCallData.receiverId,
      callType: incomingCallData.callType,
      callId: incomingCallData.callId,
      roomName: incomingCallData.roomName,
    });

    console.log("✅ acceptCall event emitted to socket server");

    // Update state with success
    yield put(acceptCallSuccess(incomingCallData));

    console.log("🎯 Call accepted successfully!");
  } catch (error: any) {
    console.error("❌ Error in acceptCall saga:", error);
    yield put(acceptCallFailure(error.message || "Failed to accept call"));
  }
}

// Socket event handlers
function* setupSocketListeners(): Generator<any, void, any> {
  const socket = socketManager.getSocket();
  if (!socket) return;

  // Listen for incoming calls
  socket.on("incomingCall", (data: any) => {
    console.log("📞 Incoming call received:", data);
    // This will be handled by the component that sets up the listener
  });

  // Listen for call accepted
  socket.on("callAccepted", (data: any) => {
    console.log("✅ Call accepted:", data);
    // This will be handled by the component that sets up the listener
  });

  // Listen for call connected
  socket.on("callConnected", (data: any) => {
    console.log("🎉 Call connected:", data);
    // This will be handled by the component that sets up the listener
  });

  // Listen for call ended
  socket.on("callEnded", (data: any) => {
    console.log("🔚 Call ended:", data);
    // This will be handled by the component that sets up the listener
  });

  // Listen for call declined
  socket.on("callDeclined", (data: any) => {
    console.log("❌ Call declined:", data);
    // This will be handled by the component that sets up the listener
  });

  // Listen for call failed
  socket.on("callFailed", (data: any) => {
    console.log("💥 Call failed:", data);
    // This will be handled by the component that sets up the listener
  });
}

// Main calling saga
export function* callingSaga(): Generator<any, void, any> {
  console.log("🚀 CALLING SAGA: Starting...");

  // Setup socket listeners
  yield call(setupSocketListeners);

  // Take latest actions
  yield takeLatest(initiateCallStart.type, initiateCallSaga);
  yield takeLatest(acceptCallStart.type, acceptCallSaga);
}

export default callingSaga;
