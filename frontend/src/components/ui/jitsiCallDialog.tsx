import { FC, useState, useEffect, useRef } from "react";
import { IoCall, IoCallOutline, IoClose } from "react-icons/io5";
import { BsThreeDots } from "react-icons/bs";
import unifiedCallingService, {
  UnifiedCallData,
} from "../../services/unifiedCallingService";

interface JitsiCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  callType: "audio" | "video";
  callerName: string;
  callerAvatar?: string;
  isIncoming?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onEndCall?: () => void;
  onCancel?: () => void;
  callData?: UnifiedCallData;
  onCallEnded?: () => void;
}

const JitsiCallDialog: FC<JitsiCallDialogProps> = ({
  isOpen,
  onClose,
  callType,
  callerName,
  callerAvatar = "/profile.jpg",
  isIncoming = false,
  onAccept,
  onDecline,
  onEndCall,
  onCancel,
  callData,
  onCallEnded,
}) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentPlatform, setCurrentPlatform] = useState<
    "jitsi" | "webrtc" | null
  >(null);
  const [platformStats, setPlatformStats] = useState(
    unifiedCallingService.getPlatformStats()
  );
  const [showPlatformInfo, setShowPlatformInfo] = useState(false);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<number | null>(null);

  // Handle incoming call
  useEffect(() => {
    if (isIncoming && isOpen) {
      console.log("🔔 Incoming Jitsi call");
    }
  }, [isIncoming, isOpen]);

  // Handle call duration timer
  useEffect(() => {
    if (isCallActive) {
      console.log("🕐 Starting duration timer...");
      durationRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000) as unknown as number;
    }

    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    };
  }, [isCallActive]);

  // Setup unified calling service callbacks
  useEffect(() => {
    unifiedCallingService.onCallConnected = (data) => {
      console.log("🎉 JitsiCallDialog: Call connected:", data);
      setIsConnecting(false);
      setIsCallActive(true);
      setCurrentPlatform(data.platform || "jitsi");
      setCallDuration(0);
    };

    unifiedCallingService.onCallEnded = (data) => {
      console.log("🎵 JitsiCallDialog: Call ended:", data);
      setIsCallActive(false);
      setCallDuration(0);
      setCurrentPlatform(null);

      if (onCallEnded) {
        onCallEnded();
      }
    };

    unifiedCallingService.onCallFailed = (data) => {
      console.log("Call failed:", data);
      setIsConnecting(false);
      setIsCallActive(false);
      setCurrentPlatform(null);

      if (onCallEnded) {
        onCallEnded();
      }
    };

    unifiedCallingService.onPlatformChanged = (platform) => {
      console.log("🔄 Platform changed to:", platform);
      setCurrentPlatform(platform);
      setPlatformStats(unifiedCallingService.getPlatformStats());
    };

    return () => {
      unifiedCallingService.onCallConnected = undefined;
      unifiedCallingService.onCallEnded = undefined;
      unifiedCallingService.onCallFailed = undefined;
      unifiedCallingService.onPlatformChanged = undefined;
    };
  }, [onCallEnded]);

  // Set up Jitsi container reference
  useEffect(() => {
    if (jitsiContainerRef.current) {
      // setJitsiContainer(jitsiContainerRef.current); // This line was removed as per new_code
    }
  }, [jitsiContainerRef.current]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle call actions
  const handleAccept = async () => {
    console.log("🔄 JitsiCallDialog: Accepting call...");
    console.log("🔄 JitsiCallDialog: callData:", callData);

    if (!callData) {
      console.error("❌ No call data available");
      return;
    }

    setIsConnecting(true);

    try {
      // Accept the call using unified calling service
      const success = await unifiedCallingService.acceptCall(callData);
      if (success) {
        console.log("✅ Call accepted successfully");

        // Join the Jitsi meeting if it's a Jitsi call
        if (callData.platform === "jitsi" && callData.roomName) {
          const currentUser = JSON.parse(
            localStorage.getItem("authUser") || "{}"
          );
          const displayName = currentUser.name || "User";

          try {
            await unifiedCallingService.joinMeeting(
              callData.roomName,
              displayName,
              callData.callType === "audio"
            );
            console.log("✅ Jitsi meeting joined successfully");
          } catch (error) {
            console.error("❌ Failed to join Jitsi meeting:", error);
            // No fallback available - Jitsi-only system
            console.log("🔄 Jitsi failed - no fallback available");
          }
        }
      } else {
        console.error("❌ Failed to accept call");
        setIsConnecting(false);
        return;
      }
    } catch (error) {
      console.error("❌ Error accepting call:", error);
      setIsConnecting(false);
    }

    if (onAccept) onAccept();
  };

  const handleDecline = async () => {
    console.log("🔄 JitsiCallDialog: Declining call...");

    try {
      if (callData) {
        await unifiedCallingService.declineCall(callData);
      }
    } catch (error) {
      console.error("❌ Error declining call:", error);
    }

    if (onDecline) onDecline();
    onClose();
  };

  const handleCancel = async () => {
    console.log("🔄 JitsiCallDialog: Cancelling call...");

    try {
      await unifiedCallingService.endCall();
    } catch (error) {
      console.error("❌ Error cancelling call:", error);
    }

    if (onCancel) onCancel();
    onClose();
  };

  const handleEndCall = async () => {
    console.log("🔄 JitsiCallDialog: Ending call...");

    try {
      await unifiedCallingService.endCall();
    } catch (error) {
      console.error("❌ Error ending call:", error);
    }

    if (onEndCall) onEndCall();
    onClose();
  };

  // Handle platform switching (disabled for Jitsi-only)
  const handlePlatformSwitch = async () => {
    console.log("🔄 Platform switching is disabled - using Jitsi only");
    return;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {isIncoming ? "Incoming Call" : "Calling..."}
            </h2>
            {currentPlatform && (
              <p className="text-sm text-gray-600 mt-1">
                Using {currentPlatform.toUpperCase()} platform
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Caller Info */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <img
              src={callerAvatar}
              alt={callerName}
              className="w-full h-full rounded-full object-cover"
            />
            {callType === "video" && (
              <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-pulse"></div>
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {callerName}
          </h3>
          <p className="text-gray-600">
            {isCallActive
              ? formatDuration(callDuration)
              : isIncoming
              ? callType === "video"
                ? "Incoming Video Call"
                : "Incoming Audio Call"
              : isConnecting
              ? "Connecting..."
              : "Calling..."}
          </p>

          {/* Platform Info */}
          <div className="mt-2">
            <button
              onClick={() => setShowPlatformInfo(!showPlatformInfo)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              {showPlatformInfo ? "Hide" : "Show"} Platform Info
            </button>
          </div>

          {showPlatformInfo && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-left text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <strong>Jitsi:</strong>{" "}
                  {platformStats.jitsiAvailable
                    ? "✅ Available"
                    : "❌ Not Available"}
                </div>
                <div>
                  <strong>WebRTC:</strong>{" "}
                  {platformStats.webrtcAvailable
                    ? "✅ Available"
                    : "❌ Not Available"}
                </div>
                <div>
                  <strong>Preferred:</strong> {platformStats.preferred}
                </div>
                <div>
                  <strong>Recommended:</strong> {platformStats.recommended}
                </div>
                <div>
                  <strong>Fallback:</strong>{" "}
                  {platformStats.fallbackEnabled ? "✅ Enabled" : "❌ Disabled"}
                </div>
              </div>

              {/* Platform Switching Controls */}
              {isCallActive && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Switch Platform:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePlatformSwitch()}
                      disabled={
                        !platformStats.jitsiAvailable ||
                        currentPlatform === "jitsi"
                      }
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
                    >
                      Switch to Jitsi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Jitsi Meeting Container */}
        <div className="mb-6">
          {isCallActive && currentPlatform === "jitsi" ? (
            <div className="relative bg-gray-100 rounded-lg overflow-hidden h-96">
              <div
                ref={jitsiContainerRef}
                id="jitsi-container"
                className="w-full h-full"
              />
              <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                Jitsi Meeting Active
              </div>
            </div>
          ) : isConnecting ? (
            <div className="relative bg-gray-100 rounded-lg overflow-hidden h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-blue-600 text-lg">
                  Connecting to Jitsi meeting...
                </p>
              </div>
            </div>
          ) : (
            <div className="relative bg-gray-100 rounded-lg overflow-hidden h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">📞</div>
                <p className="text-gray-600 text-lg">
                  {isIncoming ? "Incoming call..." : "Preparing call..."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Jitsi Features Info */}
        {currentPlatform === "jitsi" && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-700 mb-2">
              🎯 Jitsi Features Available:
            </h4>
            <div className="text-xs text-blue-600 space-y-1">
              <p>
                🎤 Use Jitsi controls for mute, camera, screen share, and more
              </p>
              <p>💬 Chat, recording, and other features available in Jitsi</p>
              <p>🖥️ Screen sharing and presentation mode supported</p>
              <p>📱 Works on all devices and browsers</p>
            </div>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex justify-center space-x-4 mb-6">
          {/* More Options */}
          <button
            className="p-4 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200"
            title="More options"
          >
            <BsThreeDots size={24} />
          </button>
        </div>

        {/* Call Action Buttons */}
        {isIncoming ? (
          <div className="flex justify-center space-x-4">
            {/* Decline Button */}
            <button
              onClick={handleDecline}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
              title="Decline call"
            >
              <IoCallOutline size={24} />
            </button>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              className="p-4 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors duration-200"
              title="Accept call"
            >
              <IoCall size={24} />
            </button>
          </div>
        ) : isCallActive ? (
          /* End Call Button for active calls */
          <div className="flex justify-center">
            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
              title="End call"
            >
              <IoCallOutline size={24} />
            </button>
          </div>
        ) : (
          /* Cancel Button for outgoing calls that haven't connected yet */
          <div className="flex justify-center">
            <button
              onClick={handleCancel}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
              title="Cancel call"
            >
              <IoCallOutline size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JitsiCallDialog;
