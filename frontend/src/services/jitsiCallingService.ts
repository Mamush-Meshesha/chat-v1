import { JitsiMeeting } from "@jitsi/react-sdk";
import axios from "axios";
import { getApiUrl } from "../config/config";
import socketManager from "./socketManager";

export interface JitsiCallData {
  callId: string;
  callerId: string;
  receiverId: string;
  callType: "audio" | "video";
  callerName: string;
  callerAvatar?: string;
  status: "ringing" | "active" | "ended";
  roomName: string;
}

export interface JitsiCall {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callData: JitsiCallData;
  jitsiApi: any;
}

class JitsiCallingService {
  private activeCall: JitsiCall | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private jitsiApi: any = null;
  private callStartTime: number | null = null;
  private socket: any = null;

  // Callback functions that components can set
  onCallConnected?: (data: any) => void;
  onCallEnded?: (data: any) => void;
  onCallFailed?: (data: any) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onIncomingCall?: (data: any) => void;

  constructor() {
    console.log("🚀 JitsiCallingService initialized");
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = socketManager.getSocket();
    if (this.socket) {
      this.setupSocketListeners();
    } else {
      // Wait for socket to be available by checking periodically
      this.waitForSocket();
    }
  }

  private waitForSocket() {
    const checkSocket = () => {
      this.socket = socketManager.getSocket();
      if (this.socket) {
        this.setupSocketListeners();
      } else {
        // Check again in 100ms
        setTimeout(checkSocket, 100);
      }
    };
    checkSocket();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    console.log("🔌 Setting up Jitsi socket listeners");

    // Handle incoming calls
    this.socket.on("incomingCall", (data: any) => {
      console.log("📞 Incoming Jitsi call received:", data);
      if (this.onIncomingCall) {
        this.onIncomingCall(data);
      }
    });

    // Handle call accepted
    this.socket.on("callAccepted", (data: any) => {
      console.log("✅ Jitsi call accepted:", data);
      if (this.activeCall) {
        this.activeCall.callData.status = "active";
        this.callStartTime = Date.now();
      }
      if (this.onCallConnected) {
        this.onCallConnected(data);
      }
    });

    // Handle call connected
    this.socket.on("callConnected", (data: any) => {
      console.log("🎉 Jitsi call connected:", data);
      if (this.activeCall) {
        this.activeCall.callData.status = "active";
        this.callStartTime = Date.now();
      }
      if (this.onCallConnected) {
        this.onCallConnected(data);
      }
    });

    // Handle call ended
    this.socket.on("callEnded", (data: any) => {
      console.log("🔚 Jitsi call ended:", data);
      this.endCall();
      if (this.onCallEnded) {
        this.onCallEnded(data);
      }
    });

    // Handle call declined
    this.socket.on("callDeclined", (data: any) => {
      console.log("❌ Jitsi call declined:", data);
      this.cleanupCall();
      if (this.onCallEnded) {
        this.onCallEnded(data);
      }
    });

    // Handle call failed
    this.socket.on("callFailed", (data: any) => {
      console.log("💥 Jitsi call failed:", data);
      this.cleanupCall();
      if (this.onCallFailed) {
        this.onCallFailed(data);
      }
    });

    // Handle participant joined
    this.socket.on("participantJoined", (data: any) => {
      console.log("👤 Participant joined Jitsi meeting:", data);
    });

    // Handle participant left
    this.socket.on("participantLeft", (data: any) => {
      console.log("👤 Participant left Jitsi meeting:", data);
    });
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

  // Generate a unique room name for Jitsi
  private generateRoomName(callerId: string, receiverId: string): string {
    const sortedIds = [callerId, receiverId].sort();
    return `chat-${sortedIds[0]}-${sortedIds[1]}-${Date.now()}`;
  }

  // Get current user ID from localStorage
  private getCurrentUserId(): string | null {
    try {
      const authUser = localStorage.getItem("authUser");
      if (authUser) {
        const user = JSON.parse(authUser);
        return user._id || null;
      }
      return null;
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return null;
    }
  }

  // Get current user info from localStorage
  private getCurrentUserInfo(): { name: string; email: string } | null {
    try {
      const authUser = localStorage.getItem("authUser");
      if (authUser) {
        const user = JSON.parse(authUser);
        return {
          name: user.name || "User",
          email: user.email || "",
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting current user info:", error);
      return null;
    }
  }

  // Set socket from outside the service
  setSocket(socket: any) {
    console.log("🔌 Setting socket in Jitsi calling service:", socket?.id);
    this.socket = socket;
  }

  // Initialize call
  async initiateCall(
    callData: Omit<JitsiCallData, "callId" | "status" | "roomName">
  ): Promise<boolean> {
    try {
      console.log("=== JITSI CALLING SERVICE: initiateCall ===");
      console.log("Call data received:", callData);

      // Ensure socket is available
      if (!this.socket) {
        this.socket = socketManager.getSocket();
        if (!this.socket) {
          throw new Error("Socket not available");
        }
      }

      // Create call record in backend
      console.log("Creating call record in backend...");
      const callRecordId = await this.createCallRecord({
        receiverId: callData.receiverId,
        type: "outgoing",
        callType: callData.callType,
      });
      console.log("✅ Call record created:", callRecordId);

      // Set active call
      const callId =
        callRecordId ||
        `${callData.callerId}-${callData.receiverId}-${Date.now()}`;
      const roomName = this.generateRoomName(
        callData.callerId,
        callData.receiverId
      );

      this.activeCall = {
        localStream: null,
        remoteStream: null,
        callData: {
          ...callData,
          callId,
          roomName,
          status: "ringing",
        },
        jitsiApi: null,
      };

      console.log("✅ Active call set:", this.activeCall);
      console.log("✅ Room name generated:", roomName);

      // Emit initiateCall event to socket server
      console.log("🔌 About to emit initiateCall event...");
      console.log("🔌 Socket being used:", this.socket?.id);
      console.log("🔌 Socket connected:", this.socket?.connected);
      console.log("🔌 SocketManager socket:", socketManager.getSocket()?.id);

      this.socket.emit("initiateCall", {
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callType: callData.callType,
        callId: callId,
        roomName: roomName,
        callerName: callData.callerName,
        callerAvatar: callData.callerAvatar,
      });

      console.log("✅ initiateCall event emitted to socket server");

      return true;
    } catch (error) {
      console.error("❌ Error in initiateCall:", error);
      this.cleanupCall();
      return false;
    }
  }

  // Accept call and join Jitsi meeting
  async acceptCall(callData: JitsiCallData): Promise<boolean> {
    try {
      console.log("🔄 JITSI CALLING SERVICE: acceptCall called");
      console.log("🔄 Call data received:", callData);

      // Ensure socket is available
      if (!this.socket) {
        this.socket = socketManager.getSocket();
        if (!this.socket) {
          throw new Error("Socket not available");
        }
      }

      // Set active call
      this.activeCall = {
        localStream: null,
        remoteStream: null,
        callData,
        jitsiApi: null,
      };

      console.log("✅ Call accepted successfully in Jitsi calling service");
      console.log("✅ Active call set:", !!this.activeCall);

      // Emit acceptCall event to socket server
      this.socket.emit("acceptCall", {
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callType: callData.callType,
        callId: callData.callId,
        roomName: callData.roomName,
      });

      console.log("✅ acceptCall event emitted to socket server");

      // Get current user info for Jitsi
      const currentUser = this.getCurrentUserInfo();
      if (!currentUser) {
        throw new Error("Failed to get current user info");
      }

      // Automatically join the meeting after accepting
      console.log("🎯 Auto-joining Jitsi meeting after call acceptance...");
      try {
        await this.joinMeeting(
          callData.roomName,
          currentUser.name,
          callData.callType === "audio"
        );
        console.log(
          "✅ Successfully joined Jitsi meeting after call acceptance"
        );
        return true;
      } catch (meetingError) {
        console.error(
          "❌ Failed to join meeting after call acceptance:",
          meetingError
        );
        this.cleanupCall();
        return false;
      }
    } catch (error) {
      console.error("Failed to accept call:", error);
      this.cleanupCall();
      return false;
    }
  }

  // Join Jitsi meeting
  async joinMeeting(
    roomName: string,
    displayName: string,
    isAudioOnly: boolean = false
  ): Promise<any> {
    try {
      console.log("🔄 Joining Jitsi meeting:", roomName);

      // Find the Jitsi container
      const jitsiContainer = document.getElementById("jitsi-container");
      if (!jitsiContainer) {
        console.error("❌ Jitsi container not found!");
        throw new Error("Jitsi container not found");
      }

      console.log("✅ Found Jitsi container:", jitsiContainer);

      // Jitsi configuration
      const config = {
        roomName,
        width: "100%",
        height: "100%",
        parentNode: jitsiContainer,
        userInfo: {
          displayName,
          email: this.getCurrentUserInfo()?.email || "user@example.com",
        },
        configOverwrite: {
          // Audio/Video settings
          startAudioOnly: isAudioOnly,
          startWithAudioMuted: false,
          startWithVideoMuted: isAudioOnly,
          disableAudioLevels: false,
          // Jitsi server configuration
          websocket: "wss://meet.jit.si/xmpp-websocket",
          // Room settings
          maxFullResolutionParticipants: 2,
          maxThumbnails: 2,
          // Security settings
          disableModeratorIndicator: true,
          enableLobbyChat: false,
          // UI settings
          disable1On1Mode: false,
          // Recording settings
          fileRecordingsEnabled: false,
          liveStreamingEnabled: false,
          // Chat settings
          chatEnabled: true,
          // Screen sharing
          desktopSharingEnabled: true,
          desktopSharingSources: ["screen", "window", "tab"],
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "closedcaptions",
            "desktop",
            "fullscreen",
            "fodeviceselection",
            "hangup",
            "chat",
            "recording",
            "livestreaming",
            "etherpad",
            "sharedvideo",
            "settings",
            "raisehand",
            "videoquality",
            "filmstrip",
            "feedback",
            "stats",
            "shortcuts",
            "tileview",
            "select-background",
            "download",
            "help",
            "mute-everyone",
            "security",
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_POWERED_BY: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_PROMOTIONAL_CLOSE: false,
          SHOW_HEADER: false,
          SHOW_FOOTER: false,
          SHOW_MEETING_NAME: false,
          SHOW_MEETING_NAME_HEADER: false,
          SHOW_MEETING_NAME_FOOTER: false,
          SHOW_MEETING_NAME_IN_HEADER: false,
          SHOW_MEETING_NAME_IN_FOOTER: false,
          SHOW_MEETING_NAME_IN_TOOLBAR: false,
          SHOW_MEETING_NAME_IN_TITLE: false,
          SHOW_MEETING_NAME_IN_URL: false,
          // Custom styling
          TOOLBAR_ALWAYS_VISIBLE: true,
          VERTICAL_FILMSTRIP: false,
          HIDE_JITSI_WATERMARK: true,
          HIDE_WATERMARK_FOR_GUESTS: true,
          HIDE_POWERED_BY: true,
          HIDE_BRAND_WATERMARK: true,
          HIDE_PROMOTIONAL_CLOSE: true,
        },
      };

      console.log("🎯 Jitsi config:", config);

      // Create Jitsi meeting
      const jitsiApi = new (JitsiMeeting as any)(config);
      console.log("✅ Jitsi meeting created:", jitsiApi);

      // Store the API reference
      if (this.activeCall) {
        this.activeCall.jitsiApi = jitsiApi;
      }

      // Set up event handlers
      jitsiApi.addEventListeners({
        readyToClose: () => {
          console.log("Jitsi meeting ready to close");
          this.endCall();
        },
        participantLeft: (participant: any) => {
          console.log("Participant left:", participant);
          // Notify socket server
          if (this.socket && this.activeCall) {
            this.socket.emit("leaveMeeting", {
              roomName: this.activeCall.callData.roomName,
              userId: this.getCurrentUserId(),
            });
          }
          if (this.onCallEnded) {
            this.onCallEnded({ reason: "Participant left", participant });
          }
        },
        participantJoined: (participant: any) => {
          console.log("Participant joined:", participant);
          // Notify socket server
          if (this.socket && this.activeCall) {
            this.socket.emit("joinMeeting", {
              roomName: this.activeCall.callData.roomName,
              userId: this.getCurrentUserId(),
              displayName: this.getCurrentUserInfo()?.name || "User",
            });
          }
          if (this.onCallConnected) {
            this.onCallConnected({ participant });
          }
        },
        audioMuteStatusChanged: (data: any) => {
          console.log("Audio mute status changed:", data);
        },
        videoMuteStatusChanged: (data: any) => {
          console.log("Video mute status changed:", data);
        },
        screenSharingStatusChanged: (data: any) => {
          console.log("Screen sharing status changed:", data);
        },
        chatMessageReceived: (data: any) => {
          console.log("Chat message received:", data);
        },
        recordingStatusChanged: (data: any) => {
          console.log("Recording status changed:", data);
        },
        livestreamingStatusChanged: (data: any) => {
          console.log("Livestreaming status changed:", data);
        },
        videoConferenceJoined: (data: any) => {
          console.log("Video conference joined:", data);
          this.callStartTime = Date.now();
          if (this.activeCall) {
            this.activeCall.callData.status = "active";
          }
          if (this.onCallConnected) {
            this.onCallConnected(data);
          }
        },
        videoConferenceLeft: (data: any) => {
          console.log("Video conference left:", data);
          this.endCall();
        },
        videoQualityChanged: (data: any) => {
          console.log("Video quality changed:", data);
        },
        audioLevelChanged: (data: any) => {
          console.log("Audio level changed:", data);
        },
        dominantSpeakerChanged: (data: any) => {
          console.log("Dominant speaker changed:", data);
        },
        lastNEndpointsChanged: (data: any) => {
          console.log("Last N endpoints changed:", data);
        },
        endpointTextMessageReceived: (data: any) => {
          console.log("Endpoint text message received:", data);
        },
        endpointMessageReceived: (data: any) => {
          console.log("Endpoint message received:", data);
        },
        endpointSilenceChanged: (data: any) => {
          console.log("Endpoint silence changed:", data);
        },
        endpointMuteChanged: (data: any) => {
          console.log("Endpoint mute changed:", data);
        },
        endpointVideoStatusChanged: (data: any) => {
          console.log("Endpoint video status changed:", data);
        },
        endpointAudioStatusChanged: (data: any) => {
          console.log("Endpoint audio status changed:", data);
        },
        endpointDataChannelOpened: (data: any) => {
          console.log("Endpoint data channel opened:", data);
        },
        endpointDataChannelClosed: (data: any) => {
          console.log("Endpoint data channel closed:", data);
        },
        endpointDataChannelMessageReceived: (data: any) => {
          console.log("Endpoint data channel message received:", data);
        },
        endpointDataChannelError: (data: any) => {
          console.log("Endpoint data channel error:", data);
        },
        endpointDataChannelBufferedAmountChanged: (data: any) => {
          console.log("Endpoint data channel buffered amount changed:", data);
        },
        endpointDataChannelStateChanged: (data: any) => {
          console.log("Endpoint data channel state changed:", data);
        },
        endpointDataChannelMaxRetransmitsChanged: (data: any) => {
          console.log("Endpoint data channel max retransmits changed:", data);
        },
        endpointDataChannelMaxPacketLifeTimeChanged: (data: any) => {
          console.log(
            "Endpoint data channel max packet life time changed:",
            data
          );
        },
        endpointDataChannelOrderedChanged: (data: any) => {
          console.log("Endpoint data channel ordered changed:", data);
        },
        endpointDataChannelProtocolChanged: (data: any) => {
          console.log("Endpoint data channel protocol changed:", data);
        },
        endpointDataChannelLabelChanged: (data: any) => {
          console.log("Endpoint data channel label changed:", data);
        },
        endpointDataChannelIdChanged: (data: any) => {
          console.log("Endpoint data channel ID changed:", data);
        },
        endpointDataChannelDirectionChanged: (data: any) => {
          console.log("Endpoint data channel direction changed:", data);
        },
        endpointDataChannelPriorityChanged: (data: any) => {
          console.log("Endpoint data channel priority changed:", data);
        },
        endpointDataChannelReliabilityChanged: (data: any) => {
          console.log("Endpoint data channel reliability changed:", data);
        },
        endpointDataChannelStreamIdChanged: (data: any) => {
          console.log("Endpoint data channel stream ID changed:", data);
        },
      });

      console.log("✅ Jitsi meeting joined successfully");
      return jitsiApi;
    } catch (error) {
      console.error("❌ Error joining Jitsi meeting:", error);
      throw error;
    }
  }

  // End call
  async endCall() {
    try {
      if (this.activeCall && this.activeCall.jitsiApi) {
        console.log("Ending Jitsi call...");
        this.activeCall.jitsiApi.executeCommand("hangup");
      }

      // Notify socket server
      if (this.socket && this.activeCall) {
        this.socket.emit("endCall", {
          callerId: this.activeCall.callData.callerId,
          receiverId: this.activeCall.callData.receiverId,
          callType: this.activeCall.callData.callType,
          callId: this.activeCall.callData.callId,
          roomName: this.activeCall.callData.roomName,
        });
      }

      // Update call record in backend
      if (this.activeCall?.callData.callId) {
        let duration: number | undefined;
        if (
          this.activeCall.callData.status === "active" &&
          this.callStartTime
        ) {
          duration = Math.floor((Date.now() - this.callStartTime) / 1000);
          console.log(`✅ Call duration calculated: ${duration} seconds`);
        }

        await this.updateCallRecord(
          this.activeCall.callData.callId,
          "completed",
          duration
        );
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }

    this.cleanupCall();
  }

  // Decline call
  async declineCall(callData: JitsiCallData) {
    try {
      console.log("🔄 Declining Jitsi call:", callData);

      // Notify socket server
      if (this.socket) {
        this.socket.emit("declineCall", {
          callerId: callData.callerId,
          receiverId: callData.receiverId,
          callType: callData.callType,
          callId: callData.callId,
          roomName: callData.roomName,
        });
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
    console.log("=== JITSI CALLING SERVICE: cleanupCall ===");

    // Stop all media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    // Close Jitsi meeting
    if (this.jitsiApi) {
      try {
        this.jitsiApi.executeCommand("hangup");
      } catch (error) {
        console.log("Jitsi API already closed");
      }
      this.jitsiApi = null;
    }

    // Reset call state
    this.activeCall = null;
    this.callStartTime = null;

    console.log("✅ Jitsi call resources cleaned up");
  }

  // Get current call state
  getCurrentCall(): JitsiCall | null {
    return this.activeCall;
  }

  // Get local stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Get remote stream
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // Check if call is active
  isCallActive(): boolean {
    return this.activeCall?.callData.status === "active";
  }

  // Get call data
  getCallData(): JitsiCallData | null {
    return this.activeCall?.callData || null;
  }

  // Check if Jitsi is available
  isJitsiAvailable(): boolean {
    return typeof JitsiMeeting !== "undefined";
  }

  // Cleanup method to be called when component unmounts
  cleanup() {
    this.cleanupCall();
  }
}

export default new JitsiCallingService();
