import axios from "axios";
import { getApiUrl } from "../config/config";

export interface JaaSCallData {
  callId: string;
  callerId: string;
  receiverId: string;
  callType: "audio" | "video";
  callerName: string;
  callerAvatar?: string;
  status: "ringing" | "active" | "ended";
  roomName: string;
  jwt?: string;
}

class JaaSCallingService {
  private activeCall: JaaSCallData | null = null;
  private jitsiApi: any = null;

  constructor() {
    console.log("🚀 JaaS Calling Service initialized");
  }

  // Generate JWT token for JaaS
  private async generateJWT(roomName: string): Promise<string | null> {
    try {
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        console.error("No authentication token found");
        return null;
      }

      const response = await axios.post(
        getApiUrl("/api/jaas/generate-jwt"),
        { roomName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        return response.data.token;
      } else {
        console.error("Failed to generate JWT:", response.data.message);
        return null;
      }
    } catch (error) {
      console.error("Error generating JWT:", error);
      return null;
    }
  }

  // Create a call record in the backend
  private async createCallRecord(callData: {
    receiverId: string;
    type: "outgoing" | "incoming";
    callType: "audio" | "video";
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

  // Get current user ID from localStorage
  // private getCurrentUserId(): string | null {
  //   try {
  //     const authUser = localStorage.getItem("authUser");
  //     if (authUser) {
  //       const user = JSON.parse(authUser);
  //       return user._id || null;
  //     }
  //     return null;
  //   } catch (error) {
  //     console.error("Error getting current user ID:", error);
  //     return null;
  //   }
  // }

  // Generate unique room name
  private generateRoomName(callerId: string, receiverId: string): string {
    const timestamp = Date.now();
    return `call-${callerId}-${receiverId}-${timestamp}`;
  }

  // Callback functions that components can set
  onCallConnected?: (data: unknown) => void;
  onCallEnded?: (data: unknown) => void;
  onCallFailed?: (data: unknown) => void;

  // Initiate a call
  async initiateCall(
    callData: Omit<JaaSCallData, "callId" | "status" | "roomName" | "jwt">
  ): Promise<boolean> {
    try {
      console.log("=== JaaS CALLING SERVICE: initiateCall ===");
      console.log("Call data received:", callData);

      // Generate unique room name
      const roomName = this.generateRoomName(
        callData.callerId,
        callData.receiverId
      );
      console.log("Generated room name:", roomName);

      // Generate JWT token
      const jwt = await this.generateJWT(roomName);
      if (!jwt) {
        console.error("Failed to generate JWT token");
        return false;
      }

      // Create call record in backend
      const callRecordId = await this.createCallRecord({
        receiverId: callData.receiverId,
        type: "outgoing",
        callType: callData.callType,
      });

      const callId =
        callRecordId ||
        `${callData.callerId}-${callData.receiverId}-${Date.now()}`;

      // Set active call
      this.activeCall = {
        ...callData,
        callId,
        status: "ringing",
        roomName,
        jwt,
      };

      console.log("✅ JaaS call initiated successfully");
      return true;
    } catch (error) {
      console.error("❌ Error in initiateCall:", error);
      return false;
    }
  }

  // Accept a call
  async acceptCall(callData: JaaSCallData): Promise<boolean> {
    try {
      console.log("=== JaaS CALLING SERVICE: acceptCall ===");
      console.log("Call data received:", callData);

      // Generate JWT token for the same room
      const jwt = await this.generateJWT(callData.roomName);
      if (!jwt) {
        console.error("Failed to generate JWT token");
        return false;
      }

      // Update call data with JWT
      this.activeCall = {
        ...callData,
        jwt,
        status: "active",
      };

      console.log("✅ JaaS call accepted successfully");
      return true;
    } catch (error) {
      console.error("❌ Error in acceptCall:", error);
      return false;
    }
  }

  // End a call
  async endCall(): Promise<void> {
    try {
      if (this.activeCall) {
        console.log("Ending JaaS call:", this.activeCall.callId);

        // Update call record in backend
        if (this.activeCall.callId) {
          await this.updateCallRecord(this.activeCall.callId, "completed");
        }

        // Clean up Jitsi API
        if (this.jitsiApi) {
          this.jitsiApi.dispose();
          this.jitsiApi = null;
        }
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }

    this.cleanupCall();
  }

  // Decline a call
  async declineCall(callData: JaaSCallData): Promise<void> {
    try {
      console.log("Declining JaaS call:", callData.callId);

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
    console.log("=== JaaS CALLING SERVICE: cleanupCall ===");

    // Clean up Jitsi API
    if (this.jitsiApi) {
      this.jitsiApi.dispose();
      this.jitsiApi = null;
    }

    // Reset call state
    this.activeCall = null;

    console.log("✅ JaaS call resources cleaned up");
  }

  // Get current call state
  getCurrentCall(): JaaSCallData | null {
    return this.activeCall;
  }

  // Check if call is active
  isCallActive(): boolean {
    return this.activeCall?.status === "active";
  }

  // Cleanup method to be called when component unmounts
  cleanup() {
    this.cleanupCall();
  }
}

export default new JaaSCallingService();
