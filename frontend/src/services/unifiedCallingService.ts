import jitsiCallingService from "./jitsiCallingService";
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
  platform: "jitsi";
}

export interface UnifiedCall {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callData: UnifiedCallData;
  jitsiApi?: any;
  callStartTime?: number;
}

class UnifiedCallingService {
  private activeCall: UnifiedCall | null = null;
  private preferredPlatform: "jitsi" = "jitsi";

  // Callback functions that components can set
  onCallConnected?: (data: any) => void;
  onCallEnded?: (data: any) => void;
  onCallFailed?: (data: any) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onIncomingCall?: (data: any) => void;
  onPlatformChanged?: (platform: "jitsi") => void;

  constructor() {
    console.log("🚀 UnifiedCallingService initialized (Jitsi-only)");
    this.setupServiceCallbacks();
  }

  // Set preferred platform (always Jitsi)
  setPreferredPlatform(platform: "jitsi") {
    this.preferredPlatform = platform;
    console.log(`🎯 Preferred platform set to: ${platform}`);
  }

  // Check if Jitsi is available
  isJitsiAvailable(): boolean {
    try {
      // Check if Jitsi React SDK is available
      // The @jitsi/react-sdk package is imported, so if we can reach this code,
      // it means the package is available
      return true;
    } catch (error) {
      console.error("Error checking Jitsi availability:", error);
      return false;
    }
  }

  // Get recommended platform (always Jitsi)
  getRecommendedPlatform(): "jitsi" {
    return "jitsi";
  }

  // Get platform statistics
  getPlatformStats() {
    return {
      jitsiAvailable: this.isJitsiAvailable(),
      webrtcAvailable: false, // WebRTC is disabled
      recommended: "jitsi",
      preferred: this.preferredPlatform,
      fallbackEnabled: false, // Fallback is disabled
    };
  }

  private setupServiceCallbacks() {
    console.log("🔧 Setting up Jitsi service callbacks...");

    // Set up Jitsi service callbacks
    jitsiCallingService.onCallConnected = (data) => {
      console.log(
        "🎉 UNIFIED SERVICE: Jitsi call connected callback triggered:",
        data
      );
      if (this.onCallConnected) {
        console.log("🎉 Forwarding call connected to component...");
        this.onCallConnected(data);
      } else {
        console.warn("⚠️ No onCallConnected callback set in unified service");
      }
    };

    jitsiCallingService.onCallEnded = (data) => {
      console.log(
        "🎵 UNIFIED SERVICE: Jitsi call ended callback triggered:",
        data
      );
      if (this.onCallEnded) {
        console.log("🎵 Forwarding call ended to component...");
        this.onCallEnded(data);
      } else {
        console.warn("⚠️ No onCallEnded callback set in unified service");
      }
    };

    jitsiCallingService.onCallFailed = (data) => {
      console.log(
        "💥 UNIFIED SERVICE: Jitsi call failed callback triggered:",
        data
      );
      if (this.onCallFailed) {
        console.log("💥 Forwarding call failed to component...");
        this.onCallFailed(data);
      } else {
        console.warn("⚠️ No onCallFailed callback set in unified service");
      }
    };

    jitsiCallingService.onRemoteStream = (stream) => {
      console.log("🎵 UNIFIED SERVICE: Remote stream received:", stream);
      if (this.onRemoteStream) {
        this.onRemoteStream(stream);
      }
    };

    jitsiCallingService.onIncomingCall = (data) => {
      console.log("📞 UNIFIED SERVICE: Incoming call received:", data);
      if (this.onIncomingCall) {
        this.onIncomingCall(data);
      }
    };

    console.log("✅ Jitsi service callbacks set up successfully");
  }

  // Create a call record in the backend
  private async createCallRecord(callData: {
    receiverId: string;
    type: "outgoing" | "incoming";
    callType: "audio" | "video";
    platform: "jitsi";
  }): Promise<string | null> {
    try {
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        console.error("No auth token found");
        return null;
      }

      const response = await axios.post(
        getApiUrl("/api/calls"),
        {
          ...callData,
          startTime: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        return response.data.call._id;
      }
      return null;
    } catch (error) {
      console.error("Error creating call record:", error);
      return null;
    }
  }

  // Update call record in backend
  private async updateCallRecord(
    callId: string,
    status: "completed" | "missed" | "rejected",
    duration?: number
  ): Promise<void> {
    try {
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        console.error("No auth token found");
        return;
      }

      await axios.put(
        getApiUrl(`/api/calls/${callId}`),
        {
          status,
          endTime: new Date().toISOString(),
          duration,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error updating call record:", error);
    }
  }

  // Generate room name for Jitsi
  private generateRoomName(callerId: string, receiverId: string): string {
    const sortedIds = [callerId, receiverId].sort();
    return `meet-${sortedIds[0]}-${sortedIds[1]}-${Date.now()}`;
  }

  // Initialize call with Jitsi only
  async initiateCall(
    callData: Omit<
      UnifiedCallData,
      "callId" | "status" | "roomName" | "platform"
    >
  ): Promise<boolean> {
    try {
      console.log(
        "🚀 UNIFIED CALLING SERVICE: initiateCall called (Jitsi-only)"
      );
      console.log("Call data received:", callData);

      // Check if Jitsi is available
      if (!this.isJitsiAvailable()) {
        throw new Error("Jitsi is not available in this browser");
      }

      // Generate room name
      const roomName = this.generateRoomName(
        callData.callerId,
        callData.receiverId
      );

      // Create call record in backend
      const callRecordId = await this.createCallRecord({
        receiverId: callData.receiverId,
        type: "outgoing",
        callType: callData.callType,
        platform: "jitsi",
      });

      if (!callRecordId) {
        throw new Error("Failed to create call record");
      }

      // Set active call
      const callId = callRecordId;
      this.activeCall = {
        localStream: null,
        remoteStream: null,
        callData: {
          ...callData,
          callId,
          roomName,
          status: "ringing",
          platform: "jitsi",
        },
        jitsiApi: undefined,
        callStartTime: Date.now(),
      };

      // Initiate call using Jitsi
      const success = await jitsiCallingService.initiateCall({
        ...callData,
      });

      if (success) {
        console.log("✅ Call initiated successfully using Jitsi");
        return true;
      } else {
        throw new Error("Failed to initiate call using Jitsi");
      }
    } catch (error) {
      console.error("❌ Error in initiateCall:", error);
      this.cleanupCall();
      return false;
    }
  }

  // Accept call with Jitsi only
  async acceptCall(callData: UnifiedCallData): Promise<boolean> {
    try {
      console.log("🔄 UNIFIED CALLING SERVICE: acceptCall called (Jitsi-only)");
      console.log("Call data received:", callData);

      // Set active call
      this.activeCall = {
        localStream: null,
        remoteStream: null,
        callData,
        jitsiApi: undefined,
        callStartTime: Date.now(),
      };

      console.log("✅ Active call set:", this.activeCall);

      // Accept call using Jitsi
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

      console.log("🎯 Calling Jitsi service with data:", jitsiCallData);
      console.log("🎯 Jitsi service instance:", jitsiCallingService);

      const success = await jitsiCallingService.acceptCall(jitsiCallData);
      console.log("🎯 Jitsi service acceptCall result:", success);

      if (success) {
        console.log("✅ Call accepted successfully using Jitsi");
        return true;
      } else {
        console.error("❌ Jitsi service failed to accept call");
        throw new Error("Failed to accept call using Jitsi");
      }
    } catch (error) {
      console.error("❌ Failed to accept call:", error);
      this.cleanupCall();
      return false;
    }
  }

  // Join meeting (Jitsi only)
  async joinMeeting(
    roomName: string,
    displayName: string,
    isAudioOnly: boolean = false
  ): Promise<any> {
    try {
      if (!this.activeCall) {
        throw new Error("No active call");
      }

      console.log("🔄 Joining Jitsi meeting");
      return await jitsiCallingService.joinMeeting(
        roomName,
        displayName,
        isAudioOnly
      );
    } catch (error) {
      console.error("Error joining meeting:", error);
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

      console.log("🔚 Ending call...");

      // End call using Jitsi
      if (this.activeCall.callData.platform === "jitsi") {
        await jitsiCallingService.endCall();
      }

      // Update call record in backend
      if (this.activeCall.callData.callId) {
        const duration = this.activeCall.callStartTime
          ? Math.floor((Date.now() - this.activeCall.callStartTime) / 1000)
          : undefined;

        await this.updateCallRecord(
          this.activeCall.callData.callId,
          "completed",
          duration
        );
      }

      this.cleanupCall();
    } catch (error) {
      console.error("Error ending call:", error);
      this.cleanupCall();
    }
  }

  // Decline call
  async declineCall(callData: UnifiedCallData) {
    try {
      console.log("❌ Declining call...");

      // Decline call using Jitsi
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

      // Update call record in backend
      if (callData.callId) {
        await this.updateCallRecord(callData.callId, "rejected");
      }

      this.cleanupCall();
    } catch (error) {
      console.error("Error declining call:", error);
      this.cleanupCall();
    }
  }

  // Clean up call resources
  private cleanupCall() {
    if (this.activeCall) {
      // Clean up Jitsi if needed
      if (this.activeCall.jitsiApi) {
        try {
          this.activeCall.jitsiApi.dispose();
        } catch (error) {
          console.error("Error disposing Jitsi API:", error);
        }
      }
    }

    this.activeCall = null;
    console.log("🧹 Call resources cleaned up");
  }

  // Get current call
  getCurrentCall(): UnifiedCall | null {
    return this.activeCall;
  }

  // Get local stream (for compatibility)
  getLocalStream(): MediaStream | null {
    return this.activeCall?.localStream || null;
  }

  // Get remote stream (for compatibility)
  getRemoteStream(): MediaStream | null {
    return this.activeCall?.remoteStream || null;
  }

  // Check if call is active
  isCallActive(): boolean {
    return this.activeCall !== null;
  }

  // Get call data
  getCallData(): UnifiedCallData | null {
    return this.activeCall?.callData || null;
  }

  // Get current platform (always Jitsi)
  getCurrentPlatform(): "jitsi" | null {
    return this.activeCall ? "jitsi" : null;
  }

  // Platform switching is disabled (Jitsi-only)
  async switchPlatform(): Promise<boolean> {
    console.log("🔄 Platform switching is disabled - using Jitsi only");
    return true; // Always return true since we're already on Jitsi
  }

  // Cleanup service
  cleanup() {
    this.cleanupCall();
    console.log("🧹 UnifiedCallingService cleaned up");
  }
}

export default new UnifiedCallingService();
