import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CallData {
  callId: string;
  callerId: string;
  receiverId: string;
  callType: "audio" | "video";
  callerName: string;
  callerAvatar?: string;
  status: "ringing" | "active" | "ended" | "declined" | "missed";
  roomName: string | null;
  platform: "webrtc";
}

export interface CallingState {
  // Outgoing call state
  outgoingCallData: CallData | null;
  isCallDialogOpen: boolean;

  // Incoming call state
  incomingCallData: CallData | null;
  isIncomingCall: boolean;

  // Active call state
  isCallActive: boolean;
  currentCall: CallData | null;

  // Room management
  roomName: string | null;

  // Loading states
  isInitiatingCall: boolean;
  isAcceptingCall: boolean;

  // Error state
  callError: string | null;
}

const initialState: CallingState = {
  outgoingCallData: null,
  isCallDialogOpen: false,
  incomingCallData: null,
  isIncomingCall: false,
  isCallActive: false,
  currentCall: null,
  roomName: null,
  isInitiatingCall: false,
  isAcceptingCall: false,
  callError: null,
};

export const callingSlice = createSlice({
  name: "calling",
  initialState,
  reducers: {
    // Initiate call actions
    initiateCallStart: (
      state,
      action: PayloadAction<{
        receiverId: string;
        callType: "audio" | "video";
        receiverName: string;
      }>
    ) => {
      state.isInitiatingCall = true;
      state.callError = null;
      // Don't set room name here - let the saga handle it
      state.roomName = null;
      state.outgoingCallData = {
        callId: `outgoing-${Date.now()}`,
        callerId: "", // Will be set by saga
        receiverId: action.payload.receiverId,
        callType: action.payload.callType,
        callerName: "You",
        callerAvatar: "/profile.jpg",
        status: "ringing",
        roomName: null, // Will be set by saga
        platform: "webrtc",
      };
      state.isCallDialogOpen = true;
    },

    initiateCallSuccess: (state, action: PayloadAction<CallData>) => {
      state.isInitiatingCall = false;
      state.outgoingCallData = action.payload;
      state.currentCall = action.payload;
      state.roomName = action.payload.roomName; // Update room name with the real one
      state.callError = null;
    },

    initiateCallFailure: (state, action: PayloadAction<string>) => {
      state.isInitiatingCall = false;
      state.callError = action.payload;
      state.outgoingCallData = null;
      state.isCallDialogOpen = false;
      state.roomName = null;
    },

    // Incoming call actions
    receiveIncomingCall: (state, action: PayloadAction<CallData>) => {
      state.incomingCallData = action.payload;
      state.isIncomingCall = true;
      state.roomName = action.payload.roomName;
    },

    // Accept call actions
    acceptCallStart: (state) => {
      state.isAcceptingCall = true;
      state.callError = null;
    },

    acceptCallSuccess: (state, action: PayloadAction<CallData>) => {
      state.isAcceptingCall = false;
      state.isIncomingCall = false;
      state.incomingCallData = null;
      state.isCallActive = true;
      state.currentCall = action.payload;
      state.roomName = action.payload.roomName; // Set roomName from call data
      state.outgoingCallData = null;
      state.isCallDialogOpen = false;
    },

    acceptCallFailure: (state, action: PayloadAction<string>) => {
      state.isAcceptingCall = false;
      state.callError = action.payload;
      state.isIncomingCall = false;
      state.incomingCallData = null;
    },

    // Call connected
    callConnected: (state, action: PayloadAction<CallData>) => {
      state.isCallActive = true;
      state.currentCall = action.payload;
      state.roomName = action.payload.roomName; // Set roomName from call data
      state.outgoingCallData = null;
      state.isCallDialogOpen = false;
      state.isIncomingCall = false;
      state.incomingCallData = null;
    },

    // End call actions
    endCall: (state) => {
      state.isCallActive = false;
      state.currentCall = null;
      state.outgoingCallData = null;
      state.isCallDialogOpen = false;
      state.isIncomingCall = false;
      state.incomingCallData = null;
      state.roomName = null;
      state.callError = null;
    },

    // Decline call
    declineCall: (state) => {
      state.isIncomingCall = false;
      state.incomingCallData = null;
      state.roomName = null;
    },

    // Call failed
    callFailed: (state, action: PayloadAction<string>) => {
      state.callError = action.payload;
      state.outgoingCallData = null;
      state.isCallDialogOpen = false;
      state.isIncomingCall = false;
      state.incomingCallData = null;
      state.roomName = null;
    },

    // Clear call error
    clearCallError: (state) => {
      state.callError = null;
    },

    // Reset calling state
    resetCallingState: () => {
      return initialState;
    },
  },
});

export const {
  initiateCallStart,
  initiateCallSuccess,
  initiateCallFailure,
  receiveIncomingCall,
  acceptCallStart,
  acceptCallSuccess,
  acceptCallFailure,
  callConnected,
  endCall,
  declineCall,
  callFailed,
  clearCallError,
  resetCallingState,
} = callingSlice.actions;

export default callingSlice.reducer;
