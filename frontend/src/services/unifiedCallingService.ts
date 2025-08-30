import jitsiCallingService from "./jitsiCallingService";
import callingService from "./callingService";
import { getApiUrl } from "../config/config";
import axios from "axios";

export interface UnifiedCallData {
  callId: string;
  callerId: string;
  receiverId: string;
  callType: "audio" | "video";
  callerName: string;
  callerAvatar?: string;
  status: "ringing" | "active" | "ended";
  roomName?: string;
  platform: "jitsi" | "webrtc";
}

export interface UnifiedCall {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callData: UnifiedCallData;
  jitsiApi?: any;
  peerConnection?: RTCPeerConnection | null;
}

class UnifiedCallingService {
  private activeCall: UnifiedCall | null = null;
  private preferredPlatform: "jitsi" | "webrtc" = "jitsi";
  private fallbackToWebRTC: boolean = true;

  // Callback functions that components can set
  onCallConnected?: (data: any) => void;
  onCallEnded?: (data: any) => void;
  onCallFailed?: (data: any) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onIncomingCall?: (data: any) => void;
  onPlatformChanged?: (platform: "jitsi" | "webrtc") => void;

  constructor() {
    console.log("🚀 UnifiedCallingService initialized");
    this.setupServiceCallbacks();
  }

  // Set preferred platform
  setPreferredPlatform(platform: "jitsi" | "webrtc") {
    this.preferredPlatform = platform;
    console.log(`🎯 Preferred platform set to: ${platform}`);
  }

  // Enable/disable WebRTC fallback
  setFallbackToWebRTC(enabled: boolean) {
    this.fallbackToWebRTC = enabled;
    console.log(`🔄 WebRTC fallback ${enabled ? "enabled" : "disabled"}`);
  }

  // Check if Jitsi is available
  isJitsiAvailable(): boolean {
    return jitsiCallingService.isJitsiAvailable();
  }

  // Check if WebRTC is available
  isWebRTCAvailable(): boolean {
    return typeof RTCPeerConnection !== "undefined";
  }

  // Get recommended platform
  getRecommendedPlatform(): "jitsi" | "webrtc" {
    if (this.preferredPlatform === "jitsi" && this.isJitsiAvailable()) {
      return "jitsi";
    }
    if (this.preferredPlatform === "webrtc" && this.isWebRTCAvailable()) {
      return "webrtc";
    }
    if (this.isJitsiAvailable()) {
      return "jitsi";
    }
    if (this.isWebRTCAvailable()) {
      return "webrtc";
    }
    return "webrtc"; // Default fallback
  }

  // Setup callbacks for both services
  private setupServiceCallbacks() {
    // Jitsi service callbacks
    jitsiCallingService.onCallConnected = (data) => {
      if (this.onCallConnected) {
        this.onCallConnected({ ...data, platform: "jitsi" });
      }
    };

    jitsiCallingService.onCallEnded = (data) => {
      if (this.onCallEnded) {
        this.onCallEnded({ ...data, platform: "jitsi" });
      }
    };

    jitsiCallingService.onCallFailed = (data) => {
      if (this.onCallFailed) {
        this.onCallFailed({ ...data, platform: "jitsi" });
      }
    };

    jitsiCallingService.onIncomingCall = (data) => {
      if (this.onIncomingCall) {
        this.onIncomingCall({ ...data, platform: "jitsi" });
      }
    };

    // WebRTC service callbacks
    callingService.onCallConnected = (data) => {
      if (this.onCallConnected) {
        this.onCallConnected({ ...data, platform: "webrtc" });
      }
    };

    callingService.onCallEnded = (data) => {
      if (this.onCallEnded) {
        this.onCallEnded({ ...data, platform: "webrtc" });
      }
    };

    callingService.onCallFailed = (data) => {
      if (this.onCallFailed) {
        this.onCallFailed({ ...data, platform: "webrtc" });
      }
    };

    callingService.onRemoteStream = (stream) => {
      if (this.onRemoteStream) {
        this.onRemoteStream(stream);
      }
    };
  }

  // Create a call record in the backend
  private async createCallRecord(callData: {
    receiverId: string;
    type: "outgoing" | "incoming";
    callType: "audio" | "video";
    platform: "jitsi" | "webrtc";
  }): Promise<string | null> {
    try {
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        console.error("No authentication token found for call creation");
        return null;
      }

      const response = await axios.post(
        getApiUrl("/api/calls"),
        {
          receiverId: callData.receiverId,
          type: callData.type,
          callType: callData.callType,
          platform: callData.platform,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success || response.data._id) {
        console.log("Call record created:", response.data);
        return response.data._id || response.data.call?._id;
      } else {
        console.error("Failed to create call record:", response.data);
        return null;
      }
    } catch (error) {
      console.error("Error creating call record:", error);
      return null;
    }
  }

  // Update call record status
  private async updateCallRecord(
    callId: string,
    status: "completed" | "missed" | "rejected",
    duration?: number
  ): Promise<void> {
    try {
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        console.error("No authentication token found for call update");
        return;
      }

      await axios.put(
        getApiUrl(`/api/calls/${callId}`),
        {
          status,
          duration,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Call record updated:", { callId, status, duration });
    } catch (error) {
      console.error("Error updating call record:", error);
    }
  }

  // Generate a unique room name for Jitsi
  private generateRoomName(callerId: string, receiverId: string): string {
    const sortedIds = [callerId, receiverId].sort();
    return `chat-${sortedIds[0]}-${sortedIds[1]}-${Date.now()}`;
  }

  // Get current user ID from localStorage

  // Initialize call with automatic platform selection
  async initiateCall(
    callData: Omit<
      UnifiedCallData,
      "callId" | "status" | "roomName" | "platform"
    >
  ): Promise<boolean> {
    try {
      console.log("=== UNIFIED CALLING SERVICE: initiateCall ===");
      console.log("Call data received:", callData);

      // Determine platform to use
      const platform = this.getRecommendedPlatform();
      console.log(`🎯 Using platform: ${platform}`);

      // Create call record in backend
      const callRecordId = await this.createCallRecord({
        receiverId: callData.receiverId,
        type: "outgoing",
        callType: callData.callType,
        platform,
      });

      if (!callRecordId) {
        throw new Error("Failed to create call record");
      }

      // Set active call
      const callId = callRecordId;
      const roomName =
        platform === "jitsi"
          ? this.generateRoomName(callData.callerId, callData.receiverId)
          : undefined;

      this.activeCall = {
        localStream: null,
        remoteStream: null,
        callData: {
          ...callData,
          callId,
          roomName,
          status: "ringing",
          platform,
        },
        jitsiApi: undefined,
        peerConnection: undefined,
      };

      console.log("✅ Active call set:", this.activeCall);

      // Initiate call using the selected platform
      let success = false;
      if (platform === "jitsi") {
        success = await jitsiCallingService.initiateCall({
          ...callData,
        });
      } else {
        success = await callingService.initiateCall({
          ...callData,
        });
      }

      if (success) {
        console.log(`✅ Call initiated successfully using ${platform}`);
        return true;
      } else {
        // Try fallback if enabled
        if (
          this.fallbackToWebRTC &&
          platform === "jitsi" &&
          this.isWebRTCAvailable()
        ) {
          console.log("🔄 Jitsi failed, trying WebRTC fallback...");
          this.activeCall.callData.platform = "webrtc";

          success = await callingService.initiateCall({
            ...callData,
          });

          if (success) {
            console.log("✅ WebRTC fallback successful");
            if (this.onPlatformChanged) {
              this.onPlatformChanged("webrtc");
            }
            return true;
          }
        }

        throw new Error(`Failed to initiate call using ${platform}`);
      }
    } catch (error) {
      console.error("❌ Error in initiateCall:", error);
      this.cleanupCall();
      return false;
    }
  }

  // Accept call with automatic platform handling
  async acceptCall(callData: UnifiedCallData): Promise<boolean> {
    try {
      console.log("🔄 UNIFIED CALLING SERVICE: acceptCall called");
      console.log("🔄 Call data received:", callData);

      // Set active call
      this.activeCall = {
        localStream: null,
        remoteStream: null,
        callData,
        jitsiApi: undefined,
        peerConnection: undefined,
      };

      // Accept call using the appropriate platform
      let success = false;
      if (callData.platform === "jitsi") {
        // Convert UnifiedCallData to JitsiCallData format
        const jitsiCallData = {
          callId: callData.callId,
          callerId: callData.callerId,
          receiverId: callData.receiverId,
          callType: callData.callType,
          callerName: callData.callerName,
          callerAvatar: callData.callerAvatar,
          status: callData.status,
          roomName: callData.roomName || "",
        };
        success = await jitsiCallingService.acceptCall(jitsiCallData);
      } else {
        success = await callingService.acceptCall(callData);
      }

      if (success) {
        console.log(`✅ Call accepted successfully using ${callData.platform}`);
        return true;
      } else {
        throw new Error(`Failed to accept call using ${callData.platform}`);
      }
    } catch (error) {
      console.error("Failed to accept call:", error);
      this.cleanupCall();
      return false;
    }
  }

  // Join meeting (Jitsi) or establish connection (WebRTC)
  async joinMeeting(
    roomName: string,
    displayName: string,
    isAudioOnly: boolean = false
  ): Promise<any> {
    try {
      if (!this.activeCall) {
        throw new Error("No active call");
      }

      const platform = this.activeCall.callData.platform;
      console.log(`🔄 Joining meeting using ${platform}`);

      if (platform === "jitsi") {
        return await jitsiCallingService.joinMeeting(
          roomName,
          displayName,
          isAudioOnly
        );
      } else {
        // For WebRTC, the connection is already established in acceptCall
        console.log("✅ WebRTC connection already established");
        return null;
      }
    } catch (error) {
      console.error("❌ Error joining meeting:", error);
      throw error;
    }
  }

  // End call
  async endCall() {
    try {
      if (!this.activeCall) {
        console.log("No active call to end");
        return;
      }

      const platform = this.activeCall.callData.platform;
      console.log(`🔚 Ending call using ${platform}`);

      if (platform === "jitsi") {
        await jitsiCallingService.endCall();
      } else {
        await callingService.endCall();
      }

      // Update call record in backend
      if (this.activeCall.callData.callId) {
        await this.updateCallRecord(
          this.activeCall.callData.callId,
          "completed"
        );
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }

    this.cleanupCall();
  }

  // Decline call
  async declineCall(callData: UnifiedCallData) {
    try {
      console.log("🔄 Declining call using", callData.platform);

      if (callData.platform === "jitsi") {
        // Convert UnifiedCallData to JitsiCallData format
        const jitsiCallData = {
          callId: callData.callId,
          callerId: callData.callerId,
          receiverId: callData.receiverId,
          callType: callData.callType,
          callerName: callData.callerName,
          callerAvatar: callData.callerAvatar,
          status: callData.status,
          roomName: callData.roomName || "",
        };
        await jitsiCallingService.declineCall(jitsiCallData);
      } else {
        await callingService.declineCall(callData);
      }

      // Update call record in backend
      if (callData.callId) {
        await this.updateCallRecord(callData.callId, "rejected");
      }
    } catch (error) {
      console.error("Error declining call:", error);
    }

    this.cleanupCall();
  }

  // Clean up call resources
  private cleanupCall() {
    console.log("=== UNIFIED CALLING SERVICE: cleanupCall ===");

    // Clean up based on platform
    if (this.activeCall) {
      if (this.activeCall.callData.platform === "jitsi") {
        jitsiCallingService.cleanup();
      } else {
        callingService.cleanup();
      }
    }

    // Reset call state
    this.activeCall = null;

    console.log("✅ Unified call resources cleaned up");
  }

  // Get current call state
  getCurrentCall(): UnifiedCall | null {
    return this.activeCall;
  }

  // Get local stream
  getLocalStream(): MediaStream | null {
    if (!this.activeCall) return null;

    if (this.activeCall.callData.platform === "jitsi") {
      return jitsiCallingService.getLocalStream();
    } else {
      return callingService.getLocalStream();
    }
  }

  // Get remote stream
  getRemoteStream(): MediaStream | null {
    if (!this.activeCall) return null;

    if (this.activeCall.callData.platform === "jitsi") {
      return jitsiCallingService.getRemoteStream();
    } else {
      return callingService.getRemoteStream();
    }
  }

  // Check if call is active
  isCallActive(): boolean {
    if (!this.activeCall) return false;

    if (this.activeCall.callData.platform === "jitsi") {
      return jitsiCallingService.isCallActive();
    } else {
      return callingService.isCallActive();
    }
  }

  // Get call data
  getCallData(): UnifiedCallData | null {
    return this.activeCall?.callData || null;
  }

  // Get current platform
  getCurrentPlatform(): "jitsi" | "webrtc" | null {
    return this.activeCall?.callData.platform || null;
  }

  // Switch platform during call (if supported)
  async switchPlatform(targetPlatform: "jitsi" | "webrtc"): Promise<boolean> {
    try {
      if (!this.activeCall) {
        throw new Error("No active call to switch");
      }

      const currentPlatform = this.activeCall.callData.platform;
      if (currentPlatform === targetPlatform) {
        console.log(`Already using ${targetPlatform}`);
        return true;
      }

      console.log(`🔄 Switching from ${currentPlatform} to ${targetPlatform}`);

      // End current call
      await this.endCall();

      // Start new call with target platform
      const callData = this.activeCall.callData;
      const success = await this.initiateCall({
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callType: callData.callType,
        callerName: callData.callerName,
        callerAvatar: callData.callerAvatar,
      });

      if (success) {
        console.log(`✅ Successfully switched to ${targetPlatform}`);
        if (this.onPlatformChanged) {
          this.onPlatformChanged(targetPlatform);
        }
        return true;
      } else {
        throw new Error(`Failed to switch to ${targetPlatform}`);
      }
    } catch (error) {
      console.error("❌ Error switching platform:", error);
      return false;
    }
  }

  // Get platform statistics
  getPlatformStats(): {
    jitsiAvailable: boolean;
    webrtcAvailable: boolean;
    recommended: "jitsi" | "webrtc";
    preferred: "jitsi" | "webrtc";
    fallbackEnabled: boolean;
  } {
    return {
      jitsiAvailable: this.isJitsiAvailable(),
      webrtcAvailable: this.isWebRTCAvailable(),
      recommended: this.getRecommendedPlatform(),
      preferred: this.preferredPlatform,
      fallbackEnabled: this.fallbackToWebRTC,
    };
  }

  // Cleanup method to be called when component unmounts
  cleanup() {
    this.cleanupCall();
    jitsiCallingService.cleanup();
    callingService.cleanup();
  }
}

export default new UnifiedCallingService();
