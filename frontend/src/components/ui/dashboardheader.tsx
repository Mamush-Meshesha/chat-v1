import { FC, useEffect, useRef } from "react";
import { BsThreeDots } from "react-icons/bs";
import { MdVideoCall, MdWifiCalling3 } from "react-icons/md";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { initiateCallStart } from "../../slice/callingSlice";
import socketManager from "../../services/socketManager";

interface DashboardheaderProps {
  currentUserChat: any;
  activeUser: any[];
  socket: any;
  currentUserId: string;
}

const Dashboardheader: FC<DashboardheaderProps> = ({
  currentUserChat,
  activeUser,
  socket,
  currentUserId,
}) => {
  const dispatch = useDispatch();
  const { isCallDialogOpen, isIncomingCall, isCallActive, outgoingCallData } =
    useSelector((state: RootState) => state.calling);

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

  // Debug state changes
  useEffect(() => {
    console.log("🔍 STATE CHANGE DEBUG:", {
      isCallDialogOpen,
      outgoingCallData: outgoingCallData ? "exists" : "null",
      roomName: outgoingCallData?.roomName || "undefined",
      isCallActive,
      isIncomingCall,
    });
  }, [isCallDialogOpen, outgoingCallData, isCallActive, isIncomingCall]);

  // Initialize socketManager if not connected
  useEffect(() => {
    if (!socketManager.isConnected() && currentUserChat?._id) {
      console.log("🔌 Initializing socketManager connection...");
      socketManager.connect();
    }

    // Debug: Show current socket status
    console.log("🔌 Socket status check:", {
      socketManagerConnected: socketManager.isConnected(),
      socketManagerSocket: !!socketManager.socket,
      socketProp: !!socket,
      currentUserChat: currentUserChat?._id,
    });
  }, [currentUserChat?._id]);

  // Set up socket event listeners for calling
  useEffect(() => {
    console.log("🔌 DASHBOARD HEADER: Setting up socket event listeners...");
    console.log("🔌 socketManager.socket:", socketManager.socket);
    console.log("🔌 socket prop:", socket);
    console.log("🔌 currentUserChat?._id:", currentUserChat?._id);
    console.log("🔌 socketManager.isConnected():", socketManager.isConnected());

    // Wait for currentUserChat to be available
    if (!currentUserChat?._id) {
      console.log("⏳ Waiting for currentUserChat to be available...");
      return;
    }

    // Use socketManager.socket if available, otherwise fall back to socket prop
    const activeSocket = socketManager.socket || socket;

    // If both sockets exist, prefer the one that's connected and will receive events
    const preferredSocket = socketManager.socket?.connected
      ? socketManager.socket
      : socket?.connected
      ? socket
      : activeSocket;

    // Ensure we're using the same socket instance that will receive events
    if (!preferredSocket) {
      console.log("❌ No socket available for event listeners");
      return;
    }

    console.log("🔌 Socket instance selection:", {
      socketManagerSocket: socketManager.socket?.id,
      socketPropId: socket?.id,
      selectedSocket: preferredSocket.id,
      socketManagerConnected: socketManager.socket?.connected,
      socketPropConnected: socket?.connected,
    });

    // Check if socket is ready for event listeners
    const isSocketReady =
      activeSocket &&
      (activeSocket.connected || preferredSocket.connected) &&
      currentUserChat?._id;

    console.log("🔌 Socket ready check:", {
      activeSocket: !!activeSocket,
      connected: preferredSocket.connected,
      currentUserChat: !!currentUserChat?._id,
      isSocketReady,
    });

    if (!isSocketReady) {
      console.log("❌ Cannot set up socket event listeners:");
      console.log("  - activeSocket:", !!activeSocket);
      console.log("  - currentUserChat?._id:", !!currentUserChat?._id);
      console.log("  - socket connected:", preferredSocket.connected);
      return;
    }

    console.log(
      "🔌 Setting up socket event listeners for calling with socket:",
      preferredSocket.id
    );
    console.log("🔌 Socket instance details:", {
      socketManagerSocketId: socketManager.socket?.id,
      socketPropId: socket?.id,
      activeSocketId: activeSocket.id,
      activeSocketConnected: activeSocket.connected,
    });

    // Clean up previous listeners to prevent duplicates
    preferredSocket.off("incomingCall");
    preferredSocket.off("callAccepted");
    preferredSocket.off("callConnected");
    preferredSocket.off("callDeclined");
    preferredSocket.off("callEnded");
    preferredSocket.off("callFailed");

    // Listen for incoming calls
    preferredSocket.on("incomingCall", (data: any) => {
      console.log("📞 Incoming call received:", data);
      // This will be handled by the home component via Redux
    });

    // Listen for call accepted
    preferredSocket.on("callAccepted", (data: any) => {
      console.log("✅ Call accepted:", data);
      // This will be handled by Redux
    });

    // Listen for call connected
    preferredSocket.on("callConnected", (data: any) => {
      console.log("🎉 Call connected:", data);
      // This will be handled by Redux
    });

    // Listen for call declined
    preferredSocket.on("callDeclined", (data: any) => {
      console.log("❌ Call declined:", data);
      // This will be handled by Redux
    });

    // Listen for call ended
    preferredSocket.on("callEnded", (data: any) => {
      console.log("🔚 Call ended:", data);
      // This will be handled by Redux
    });

    // Listen for call failed
    preferredSocket.on("callFailed", (data: any) => {
      console.log("💥 Call failed:", data);
      // This will be handled by Redux
    });

    console.log("✅ All socket event listeners set up successfully");

    // Cleanup function
    return () => {
      if (preferredSocket) {
        preferredSocket.off("incomingCall");
        preferredSocket.off("callAccepted");
        preferredSocket.off("callConnected");
        preferredSocket.off("callDeclined");
        preferredSocket.off("callEnded");
        preferredSocket.off("callFailed");
      }
    };
  }, [socket, currentUserChat?._id]);

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

    try {
      console.log("🎯 Initiating call with Redux...");

      // Dispatch Redux action to initiate call
      dispatch(
        initiateCallStart({
          receiverId: currentUserChat._id,
          callType: type,
          receiverName: currentUserChat.name || "User",
        })
      );

      console.log("✅ Call initiation dispatched to Redux");
    } catch (error) {
      console.error("❌ Error initiating call:", error);
      alert("Error initiating call. Please try again.");
    }
  };

  // Handle call actions (delegated to Redux)
  // These functions are no longer needed since Redux handles everything
  // const handleAcceptCall = async () => {
  //   console.log("🔄 Dashboard header: Call accepted - delegating to Redux");
  // };

  // const handleDeclineCall = () => {
  //   console.log("🔄 Dashboard header: Call declined - delegating to Redux");
  // };

  // const handleEndCall = async () => {
  //   console.log("🔄 Dashboard header: Call ended - delegating to Redux");
  // };

  // const handleCancelCall = async () => {
  //   console.log("🔄 Dashboard header: Call cancelled - delegating to Redux");
  // };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* User Info - Responsive */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* User Avatar */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-300 rounded-full overflow-hidden flex-shrink-0">
            <img
              src={currentUserChat?.profilePicture || "/profile.jpg"}
              alt={currentUserChat?.name || "User"}
              className="w-full h-full object-cover"
            />
          </div>

          {/* User Details */}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              {currentUserChat?.name || "User"}
            </h2>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isUserActive ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <span className="text-sm text-gray-500">
                {isUserActive ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Call Actions */}
        <div className="flex items-center gap-2">
          {/* Audio Call Button */}
          <button
            onClick={() => handleCall("audio")}
            className="p-2 sm:p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title="Audio Call"
          >
            <MdWifiCalling3 className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Video Call Button */}
          <button
            onClick={() => handleCall("video")}
            className="p-2 sm:p-3 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            title="Video Call"
          >
            <MdVideoCall className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* More Options Button */}
          <button className="p-2 sm:p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
            <BsThreeDots className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Call Dialog */}
      {/* CallDialog component handles its own state via Redux */}
    </div>
  );
};

export default Dashboardheader;
