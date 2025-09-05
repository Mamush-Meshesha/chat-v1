import DailyIframe from '@daily-co/daily-js';
import axios from "axios";
import { getApiUrl } from "../config/config";

export interface DailyCallData {
  callId: string;
  callerId: string;
  receiverId: string;
  callType: "audio" | "video";
  callerName: string;
  callerAvatar?: string;
  status: "ringing" | "active" | "ended";
  roomUrl?: string;
  token?: string;
}

class DailyCallingService {
  private activeCall: DailyCallData | null = null;
  private dailyIframe: any = null;
  private callStartTime: number | null = null;

  constructor() {
    console.log("🚀 Daily Calling Service initialized");
  }

  // Generate Daily.co room URL and token
  private async generateDailyRoom(roomName: string): Promise<{ roomUrl: string; token?: string } | null> {
    try {
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        console.error("No authentication token found");
        return null;
      }

      // For now, we'll create a simple room URL
      // In production, you might want to call your backend to create a room
      const roomUrl = `https://your-domain.daily.co/${roomName}`;
      
      return { roomUrl };
    } catch (error) {
      console.error("Error generating Daily room:", error);
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
    callData: Omit<DailyCallData, "callId" | "status" | "roomUrl" | "token">
  ): Promise<boolean> {
    try {
      console.log("=== DAILY CALLING SERVICE: initiateCall ===");
      console.log("Call data received:", callData);

      // Generate unique room name
      const roomName = this.generateRoomName(callData.callerId, callData.receiverId);
      console.log("Generated room name:", roomName);

      // Generate Daily room URL
      const roomData = await this.generateDailyRoom(roomName);
      if (!roomData) {
        console.error("Failed to generate Daily room");
        return false;
      }

      // Create call record in backend
      const callRecordId = await this.createCallRecord({
        receiverId: callData.receiverId,
        type: "outgoing",
        callType: callData.callType,
      });

      const callId = callRecordId || `${callData.callerId}-${callData.receiverId}-${Date.now()}`;

      // Set active call
      this.activeCall = {
        ...callData,
        callId,
        status: "ringing",
        roomUrl: roomData.roomUrl,
        token: roomData.token,
      };

      console.log("✅ Daily call initiated successfully");
      return true;
    } catch (error) {
      console.error("❌ Error in initiateCall:", error);
      return false;
    }
  }

  // Accept a call
  async acceptCall(callData: DailyCallData): Promise<boolean> {
    try {
      console.log("=== DAILY CALLING SERVICE: acceptCall ===");
      console.log("Call data received:", callData);

      // Update call data
      this.activeCall = {
        ...callData,
        status: "active",
      };

      console.log("✅ Daily call accepted successfully");
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
        console.log("Ending Daily call:", this.activeCall.callId);

        // Clean up Daily iframe
        if (this.dailyIframe) {
          this.dailyIframe.destroy();
          this.dailyIframe = null;
        }

        // Update call record in backend
        if (this.activeCall.callId) {
          let duration: number | undefined;
          if (this.activeCall.status === "active" && this.callStartTime) {
            duration = Math.floor((Date.now() - this.callStartTime) / 1000);
          }

          await this.updateCallRecord(
            this.activeCall.callId,
            "completed",
            duration
          );
        }
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }

    this.cleanupCall();
  }

  // Decline a call
  async declineCall(callData: DailyCallData): Promise<void> {
    try {
      console.log("Declining Daily call:", callData.callId);

      // Update call record in backend
      if (callData.callId) {
        await this.updateCallRecord(callData.callId, "rejected");
      }
    } catch (error) {
      console.error("Error declining call:", error);
    }

    this.cleanupCall();
  }

  // Start Daily call
  async startCall(containerId: string): Promise<boolean> {
    try {
      if (!this.activeCall || !this.activeCall.roomUrl) {
        console.error("No active call or room URL");
        return false;
      }

      console.log("Starting Daily call in container:", containerId);

      // Create Daily iframe
      const container = document.getElementById(containerId);
      if (!container) {
        console.error("Container element not found:", containerId);
        return false;
      }

      this.dailyIframe = DailyIframe.createFrame(container, {
        showLeaveButton: true,
        showFullscreenButton: true,
        showLocalVideo: true,
        showParticipantsBar: true,
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: 'none',
        },
      });

      // Set up event listeners
      this.dailyIframe
        .on('loaded', () => {
          console.log('Daily iframe loaded');
        })
        .on('joined-meeting', () => {
          console.log('Joined Daily meeting');
          this.callStartTime = Date.now();
          this.activeCall!.status = "active";
          this.onCallConnected?.(this.activeCall);
        })
        .on('left-meeting', () => {
          console.log('Left Daily meeting');
          this.endCall();
        })
        .on('error', (error: any) => {
          console.error('Daily iframe error:', error);
          this.onCallFailed?.(error);
        });

      // Join the meeting
      await this.dailyIframe.join({
        url: this.activeCall.roomUrl,
        token: this.activeCall.token,
        userName: this.activeCall.callerName,
        userAvatar: this.activeCall.callerAvatar,
      });

      return true;
    } catch (error) {
      console.error("Error starting Daily call:", error);
      return false;
    }
  }

  // Clean up call resources
  private cleanupCall() {
    console.log("=== DAILY CALLING SERVICE: cleanupCall ===");

    // Clean up Daily iframe
    if (this.dailyIframe) {
      this.dailyIframe.destroy();
      this.dailyIframe = null;
    }

    // Reset call state
    this.activeCall = null;
    this.callStartTime = null;

    console.log("✅ Daily call resources cleaned up");
  }

  // Get current call state
  getCurrentCall(): DailyCallData | null {
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

export default new DailyCallingService();
