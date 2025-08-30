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

  // Set up socket event listeners for calling
  useEffect(() => {
    if (socketManager.socket && currentUserChat?._id) {
      console.log("🔌 Setting up socket event listeners for calling...");

      // Listen for incoming calls
      socketManager.socket.on("incomingCall", (data) => {
        console.log("📞 INCOMING CALL RECEIVED:", data);
        
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
          status: "ringing"
        });
        
        // Open call dialog
        setIsCallDialogOpen(true);
        
        // Play ringing sound
        playRingingSound();
      });

      // Listen for call accepted
      socketManager.socket.on("callAccepted", (data) => {
        console.log("✅ Call accepted:", data);
        setIsCallActive(true);
        setIsIncomingCall(false);
      });

      // Listen for call declined
      socketManager.socket.on("callDeclined", (data) => {
        console.log("❌ Call declined:", data);
        setIsCallDialogOpen(false);
        setIsIncomingCall(false);
        setOutgoingCallData(null);
        stopRingingSound();
      });

      // Listen for call ended
      socketManager.socket.on("callEnded", (data) => {
        console.log("🔚 Call ended:", data);
        setIsCallDialogOpen(false);
        setIsCallActive(false);
        setIsIncomingCall(false);
        setOutgoingCallData(null);
        stopRingingSound();
      });

      // Listen for call failed
      socketManager.socket.on("callFailed", (data) => {
        console.log("💥 Call failed:", data);
        setIsCallDialogOpen(false);
        setIsIncomingCall(false);
        setOutgoingCallData(null);
        stopRingingSound();
      });

      return () => {
        // Clean up event listeners
        if (socketManager.socket) {
          socketManager.socket.off("incomingCall");
          socketManager.socket.off("callAccepted");
          socketManager.socket.off("callDeclined");
          socketManager.socket.off("callEnded");
          socketManager.socket.off("callFailed");
        }
      };
    }
  }, [socketManager.socket, currentUserChat?._id]);

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

    if (!currentUserId) {
      console.log("❌ Current user ID not available");
      alert("User not authenticated. Please login again.");
      return;
    }

    if (!currentUserChat || !currentUserChat._id) {
      console.log("❌ Current user chat not available");
      alert("No user selected for call.");
      return;
    }

    console.log("✅ All checks passed, proceeding with call");
    console.log("Call details:", {
      callerId: currentUserId,
      receiverId: currentUserChat._id,
      callType: type,
      currentUserChat,
    });

    setCallType(type);
    setIsIncomingCall(false);
    console.log("🎯 Setting call dialog to OPEN");
    setIsCallDialogOpen(true);
    setIsCallActive(false); // Don't set active yet - wait for call to connect

    try {
      // Create outgoing call data for the dialog
      const outgoingCall = {
        callId: `outgoing-${Date.now()}`,
        callerId: currentUserId,
        receiverId: currentUserChat._id,
        callType: type,
        callerName: "You",
        callerAvatar: "/profile.jpg",
        status: "ringing" as const,
        platform: "jitsi" as const,
        roomName: "", // Will be generated by the service
      };
      setOutgoingCallData(outgoingCall);
      console.log("✅ Outgoing call data created:", outgoingCall);

      // Initiate the call using unified calling service (Jitsi)
      console.log("🎯 Initiating call with unified calling service...");
      const success = await unifiedCallingService.initiateCall({
        callerId: currentUserId,
        callerName: "You", // Current user's name
        receiverId: currentUserChat._id,
        callType: type,
        callerAvatar: "/profile.jpg",
      });

      if (success) {
        console.log("✅ Call initiated successfully with Jitsi!");
        // Keep the dialog open - the unified calling service will handle the call flow
        console.log("Call dialog state after success:", {
          isOpen: isCallDialogOpenRef.current,
          isCallActive: isCallActiveRef.current,
          callType: type,
        });
      } else {
        console.log("❌ Call initiation failed");
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
          {console.log("🎯 RENDERING CALL DIALOG:", { isCallDialogOpen, outgoingCallData })}
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
