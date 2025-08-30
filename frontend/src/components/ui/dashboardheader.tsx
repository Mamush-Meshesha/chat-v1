import { FC, useState, useEffect, useRef } from "react";
import { BsThreeDots } from "react-icons/bs";
import { MdVideoCall, MdWifiCalling3 } from "react-icons/md";
import UnifiedCallDialog from "./unifiedCallDialog";
import unifiedCallingService from "../../services/unifiedCallingService";
import socketManager from "../../services/socketManager"; // Added import for socketManager

interface DashboardheaderProps {
  currentUserChat: any;
  activeUser: any[];
  socket: any;
  currentUserId: string; // Add current user ID
}

const Dashboardheader: FC<DashboardheaderProps> = ({
  currentUserChat,
  activeUser,
  socket,
  currentUserId,
}) => {
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [outgoingCallData, setOutgoingCallData] = useState<any>(null);

  // Use refs to track current state for logging
  const isCallDialogOpenRef = useRef(false);
  const isCallActiveRef = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    isCallDialogOpenRef.current = isCallDialogOpen;
  }, [isCallDialogOpen]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  // Setup unified calling service when component mounts
  useEffect(() => {
    if (socket) {
      // The unified calling service handles its own socket initialization
      console.log("✅ Dashboard header: Unified calling service ready");
    }

    return () => {
      // Cleanup is handled by the unified calling service
    };
  }, [socket]);

  // Initialize socketManager if not connected
  useEffect(() => {
    if (!socketManager.isConnected() && currentUserChat?._id) {
      console.log("🔌 Initializing socketManager connection...");
      socketManager.connect();
    }
  }, [currentUserChat?._id]);

  // Set up socket event listeners for calling
  useEffect(() => {
    console.log("🔌 DASHBOARD HEADER: Setting up socket event listeners...");
    console.log("🔌 socketManager.socket:", socketManager.socket);
    console.log("🔌 socket prop:", socket);
    console.log("🔌 currentUserChat?._id:", currentUserChat?._id);
    console.log("🔌 socketManager.isConnected():", socketManager.isConnected());

    // Use socketManager.socket if available, otherwise fall back to socket prop
    const activeSocket = socketManager.socket || socket;

    if (activeSocket && currentUserChat?._id) {
      console.log(
        "🔌 Setting up socket event listeners for calling with socket:",
        activeSocket.id
      );

      // Listen for incoming calls
      activeSocket.on("incomingCall", (data: any) => {
        console.log("📞 INCOMING CALL RECEIVED:", data);
        console.log("📞 Call data details:", {
          callId: data.callId,
          callerId: data.callerId,
          receiverId: data.receiverId,
          callType: data.callType,
          callerName: data.callerName,
          platform: data.platform,
        });

        // Set incoming call state
        setIsIncomingCall(true);
        setCallType(data.callType);

        // Set incoming call data
        setOutgoingCallData({
          callId: data.callId,
          callerId: data.callerId,
          receiverId: data.receiverId,
          callType: data.callType,
          callerName: data.callerName || "Unknown",
          callerAvatar: data.callerAvatar || "/profile.jpg",
          platform: data.platform || "jitsi",
          status: "ringing",
        });

        // Open call dialog
        setIsCallDialogOpen(true);
        console.log("🎯 Call dialog opened for incoming call");

        // Play ringing sound
        playRingingSound();
        console.log("🔊 Ringing sound started");
      });

      // Listen for call accepted
      activeSocket.on("callAccepted", (data: any) => {
        console.log("✅ Call accepted:", data);
        setIsCallActive(true);
        setIsIncomingCall(false);
        console.log("🎯 Call status set to active");
      });

      // Listen for call declined
      activeSocket.on("callDeclined", (data: any) => {
        console.log("❌ Call declined:", data);
        setIsCallDialogOpen(false);
        setIsIncomingCall(false);
        setOutgoingCallData(null);
        stopRingingSound();
        console.log("🎯 Call dialog closed after decline");
      });

      // Listen for call ended
      activeSocket.on("callEnded", (data: any) => {
        console.log("🔚 Call ended:", data);
        setIsCallDialogOpen(false);
        setIsCallActive(false);
        setIsIncomingCall(false);
        setOutgoingCallData(null);
        stopRingingSound();
        console.log("🎯 Call dialog closed after call ended");
      });

      // Listen for call failed
      activeSocket.on("callFailed", (data: any) => {
        console.log("💥 Call failed:", data);
        setIsCallDialogOpen(false);
        setIsIncomingCall(false);
        setOutgoingCallData(null);
        stopRingingSound();
        console.log("🎯 Call dialog closed after call failed");
      });

      console.log("✅ All socket event listeners set up successfully");

      return () => {
        // Clean up event listeners
        if (activeSocket) {
          activeSocket.off("incomingCall");
          activeSocket.off("callAccepted");
          activeSocket.off("callDeclined");
          activeSocket.off("callEnded");
          activeSocket.off("callFailed");
          console.log("🧹 Socket event listeners cleaned up");
        }
      };
    } else {
      console.log("❌ Cannot set up socket event listeners:");
      console.log("  - activeSocket:", !!activeSocket);
      console.log("  - currentUserChat?._id:", !!currentUserChat?._id);
    }
  }, [socketManager.socket, socket, currentUserChat?._id]);

  // Audio functions for ringing
  const playRingingSound = () => {
    try {
      const audio = new Audio("/sounds/reciever-ringing.mp3");
      audio.loop = true;
      audio.volume = 0.5;
      audio.play().catch(console.error);
      // Store reference to stop later
      (window as any).ringingAudio = audio;
    } catch (error) {
      console.error("Failed to play ringing sound:", error);
    }
  };

  const stopRingingSound = () => {
    try {
      if ((window as any).ringingAudio) {
        (window as any).ringingAudio.pause();
        (window as any).ringingAudio.currentTime = 0;
        (window as any).ringingAudio = null;
      }
    } catch (error) {
      console.error("Failed to stop ringing sound:", error);
    }
  };

  if (!currentUserChat) return null;

  const isUserActive =
    activeUser &&
    activeUser.length > 0 &&
    activeUser.some((user) => user.userId === currentUserChat._id);

  // Handle call initiation
  const handleCall = async (type: "audio" | "video") => {
    console.log("=== CALL INITIATION DEBUG ===");
    console.log("Socket available:", !!socket);
    console.log("Socket object:", socket);
    console.log("Current user ID:", currentUserId);
    console.log("Current user chat:", currentUserChat);
    console.log("Unified calling service ready:", !!unifiedCallingService);

    if (socket) {
      console.log("Socket connected:", socket.connected);
      console.log("Socket ID:", socket.id);
    }

    if (!socket) {
      console.log("❌ Socket not available");
      alert("Socket not connected. Please refresh the page.");
      return;
    }

    if (!currentUserChat) {
      console.log("❌ No current user chat selected");
      alert("Please select a user to call.");
      return;
    }

    if (!unifiedCallingService) {
      console.log("❌ Unified calling service not available");
      alert("Calling service not available. Please refresh the page.");
      return;
    }

    try {
      console.log("🎯 Setting call dialog to OPEN");
      setIsCallDialogOpen(true);
      setCallType(type);
      setIsIncomingCall(false);

      // Create outgoing call data
      const outgoingCallData = {
        callId: `outgoing-${Date.now()}`,
        callerId: currentUserId,
        receiverId: currentUserChat._id,
        callType: type,
        callerName: "You",
        callerAvatar: "/profile.jpg",
        status: "ringing" as const,
        platform: "jitsi" as const,
      };

      console.log("✅ Outgoing call data created:", outgoingCallData);
      setOutgoingCallData(outgoingCallData);

      console.log("🎯 Initiating call with unified calling service...");
      console.log("🔌 About to pass socket to unified calling service:", socket.id);
      
      // Pass the socket to the unified calling service
      const success = await unifiedCallingService.initiateCall(
        {
          callerId: currentUserId,
          receiverId: currentUserChat._id,
          callType: type,
          callerName: "You",
          callerAvatar: "/profile.jpg",
        },
        socket // Pass the socket here
      );

      if (success) {
        console.log("✅ Call initiated successfully with Jitsi!");
        console.log("Call dialog state after success:", {
          isOpen: isCallDialogOpen,
          isCallActive: isCallActive,
          callType: type,
        });
        console.log("🎯 Call flow: Caller side complete, waiting for receiver...");
      } else {
        console.log("❌ Failed to initiate call");
        setIsCallDialogOpen(false);
        setOutgoingCallData(null);
        alert("Failed to initiate call. Please try again.");
      }
    } catch (error) {
      console.error("❌ Error initiating call:", error);
      setIsCallDialogOpen(false);
      setOutgoingCallData(null);
      alert("Error initiating call. Please try again.");
    }
  };

  // Call action handlers - These are now handled by the calling service
  const handleAcceptCall = async () => {
    console.log(
      "🔄 Dashboard header: Call accepted - delegating to calling service"
    );
    // The calling service will handle this
  };

  const handleDeclineCall = () => {
    console.log(
      "🔄 Dashboard header: Call declined - delegating to calling service"
    );
    // The calling service will handle this
  };

  const handleEndCall = async () => {
    console.log(
      "🔄 Dashboard header: Call ended - delegating to calling service"
    );
    // The calling service will handle this
  };

  const handleCancelCall = async () => {
    console.log(
      "🔄 Dashboard header: Call cancelled - delegating to calling service"
    );
    // The calling service will handle this
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* User Info - Responsive */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {currentUserChat.name
              ? currentUserChat.name.charAt(0).toUpperCase()
              : "U"}
          </div>

          {/* User Details */}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
              {currentUserChat.name || "Unknown User"}
            </h3>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isUserActive ? "bg-green-500" : "bg-gray-400"
                }`}
              ></div>
              <span className="text-xs sm:text-sm text-gray-500 truncate">
                {isUserActive ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Call Actions - Responsive */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Audio Call Button */}
          <button
            onClick={() => handleCall("audio")}
            className="p-2 sm:p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm"
            title="Audio Call"
          >
            <MdWifiCalling3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Video Call Button */}
          <button
            onClick={() => handleCall("video")}
            className="p-2 sm:p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-sm"
            title="Video Call"
          >
            <MdVideoCall className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* More Options */}
          <button className="p-2 sm:p-3 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <BsThreeDots className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Call Dialog */}
      {isCallDialogOpen && outgoingCallData && (
        <>
          {console.log("🎯 RENDERING CALL DIALOG:", {
            isCallDialogOpen,
            outgoingCallData,
          })}
          <UnifiedCallDialog
            isOpen={isCallDialogOpen}
            onClose={() => {
              console.log("🔒 Call dialog closing...");
              setIsCallDialogOpen(false);
              setIsCallActive(false);
              setOutgoingCallData(null);
            }}
            callType={callType}
            callerName={currentUserChat.name || "Unknown"}
            callerAvatar="/profile.jpg"
            isIncoming={isIncomingCall}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
            onEndCall={handleEndCall}
            onCancel={handleCancelCall}
            callData={outgoingCallData}
            onCallEnded={() => {
              console.log("🔄 Call ended, refreshing call history...");
              setIsCallDialogOpen(false);
              setOutgoingCallData(null);
              // This will trigger a refresh of call history in the calling component
              // You can add a callback prop to refresh call history if needed
            }}
          />
        </>
      )}

      {/* Debug info */}
      <div className="text-xs text-gray-500 mt-2">
        Debug: isCallDialogOpen={isCallDialogOpen.toString()}, outgoingCallData=
        {outgoingCallData ? "exists" : "null"}
      </div>
    </div>
  );
};

export default Dashboardheader;
