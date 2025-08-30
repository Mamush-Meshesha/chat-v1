import { FC, useState, useEffect, useRef } from "react";
import { IoCall, IoCallOutline, IoClose, IoVideocam } from "react-icons/io5";
import { BsThreeDots } from "react-icons/bs";
import unifiedCallingService, {
  UnifiedCallData,
} from "../../services/unifiedCallingService";

interface UnifiedCallDialogProps {
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

const UnifiedCallDialog: FC<UnifiedCallDialogProps> = ({
  isOpen,
  onClose,
  callType,
  callerName,
  callerAvatar,
  isIncoming = false,
  onAccept,
  onDecline,
  onEndCall,
  onCancel,
  callData,
  onCallEnded,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<"jitsi" | null>(null);
  const [platformStats, setPlatformStats] = useState(
    unifiedCallingService.getPlatformStats()
  );
  const [showPlatformInfo, setShowPlatformInfo] = useState(false);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Update platform stats when they change
  useEffect(() => {
    const updateStats = () => {
      setPlatformStats(unifiedCallingService.getPlatformStats());
    };

    // Update stats initially
    updateStats();

    // Set up callback for platform changes
    unifiedCallingService.onPlatformChanged = updateStats;

    return () => {
      unifiedCallingService.onPlatformChanged = undefined;
    };
  }, []);

  // Handle call duration timer
  useEffect(() => {
    if (isCallActive && callStartTimeRef.current) {
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - callStartTimeRef.current!) / 1000
        );
        setCallDuration(elapsed);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isCallActive]);

  // Set up unified calling service callbacks
  useEffect(() => {
    unifiedCallingService.onCallConnected = (data) => {
      console.log("🎉 Call connected:", data);
      setIsCallActive(true);
      setIsConnecting(false);
      setCurrentPlatform("jitsi");
      callStartTimeRef.current = Date.now();
    };

    unifiedCallingService.onCallEnded = (data) => {
      console.log("🎵 Call ended:", data);
      setIsCallActive(false);
      setIsConnecting(false);
      setCallDuration(0);
      callStartTimeRef.current = null;
      if (onCallEnded) {
        onCallEnded();
      }
    };

    unifiedCallingService.onCallFailed = (data) => {
      console.log("💥 Call failed:", data);
      setIsCallActive(false);
      setIsConnecting(false);
      setCallDuration(0);
      callStartTimeRef.current = null;
    };

    return () => {
      unifiedCallingService.onCallConnected = undefined;
      unifiedCallingService.onCallEnded = undefined;
      unifiedCallingService.onCallFailed = undefined;
    };
  }, [onCallEnded]);

  // Handle incoming call data
  useEffect(() => {
    if (callData && isIncoming) {
      setCurrentPlatform(callData.platform);
      setIsConnecting(true);
    }
  }, [callData, isIncoming]);

  // Handle call acceptance
  const handleAccept = async () => {
    if (!callData) return;

    try {
      console.log("🔄 Accepting call with data:", callData);
      setIsConnecting(true);
      const success = await unifiedCallingService.acceptCall(callData);

      if (success) {
        console.log("✅ Call accepted successfully, now joining meeting...");
        // Join the meeting if it's a Jitsi call
        if (callData.platform === "jitsi" && callData.roomName) {
          const currentUser = JSON.parse(
            localStorage.getItem("authUser") || "{}"
          );
          const displayName = currentUser.name || "User";

          console.log("🎯 Joining Jitsi meeting:", {
            roomName: callData.roomName,
            displayName,
            isAudioOnly: callData.callType === "audio",
          });

          try {
            await unifiedCallingService.joinMeeting(
              callData.roomName,
              displayName,
              callData.callType === "audio"
            );

            console.log("✅ Jitsi meeting joined successfully");
            // Update state to show call is active
            setIsConnecting(false);
            setIsCallActive(true);
            setCurrentPlatform("jitsi");
            callStartTimeRef.current = Date.now();
          } catch (meetingError) {
            console.error("❌ Failed to join Jitsi meeting:", meetingError);
            setIsConnecting(false);
            // Handle meeting join failure
            alert("Failed to join meeting. Please try again.");
            return;
          }
        } else {
          console.warn("⚠️ No room name or platform info for Jitsi call");
          setIsConnecting(false);
        }

        if (onAccept) {
          onAccept();
        }
      } else {
        console.error("❌ Failed to accept call");
        setIsConnecting(false);
      }
    } catch (error) {
      console.error("❌ Error accepting call:", error);
      setIsConnecting(false);
    }
  };

  // Handle call decline
  const handleDecline = async () => {
    if (!callData) return;

    try {
      await unifiedCallingService.declineCall(callData);
      if (onDecline) {
        onDecline();
      }
    } catch (error) {
      console.error("Error declining call:", error);
    }
  };

  // Handle call cancellation
  const handleCancel = async () => {
    try {
      await unifiedCallingService.endCall();
      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error("Error cancelling call:", error);
    }
  };

  // Handle call end
  const handleEndCall = async () => {
    try {
      await unifiedCallingService.endCall();
      if (onEndCall) {
        onEndCall();
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              {callType === "video" ? (
                <IoVideocam className="text-white text-xl" />
              ) : (
                <IoCall className="text-white text-xl" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {isIncoming ? "Incoming Call" : "Calling..."}
              </h2>
              <p className="text-sm text-gray-600">
                {callType === "video" ? "Video Call" : "Audio Call"}
              </p>
            </div>
          </div>

          {/* Platform Info */}
          <div className="flex items-center space-x-2">
            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              🎯 Jitsi
            </div>
            <button
              onClick={() => setShowPlatformInfo(!showPlatformInfo)}
              className="text-gray-400 hover:text-gray-600"
              title="Platform Information"
            >
              <BsThreeDots size={20} />
            </button>
          </div>
        </div>

        {/* Caller Info */}
        <div className="text-center mb-6">
          {callerAvatar && (
            <img
              src={callerAvatar}
              alt={callerName}
              className="w-20 h-20 rounded-full mx-auto mb-4"
            />
          )}
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {callerName}
          </h3>
          <p className="text-gray-600">
            {isIncoming ? "Incoming call..." : "Calling..."}
          </p>

          {/* Call Duration */}
          {isCallActive && callDuration > 0 && (
            <div className="mt-2 text-lg font-mono text-blue-600">
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {/* Platform Information Panel */}
        {showPlatformInfo && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-800 mb-3">Platform Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>Jitsi:</strong>{" "}
                {platformStats.jitsiAvailable
                  ? "✅ Available"
                  : "❌ Not Available"}
              </div>
              <div>
                <strong>WebRTC:</strong> ❌ Disabled
              </div>
              <div>
                <strong>Fallback:</strong> ❌ Disabled
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              <p>🎯 This system uses Jitsi exclusively for all calls</p>
              <p>✅ High-quality video and audio calls</p>
              <p>🔄 No platform switching available</p>
            </div>
          </div>
        )}

        {/* Video Display (Jitsi) */}
        {currentPlatform === "jitsi" && (
          <div className="mb-6">
            {isConnecting && !isCallActive ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-blue-600 text-lg">
                  Connecting to Jitsi meeting...
                </p>
              </div>
            ) : isCallActive ? (
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <h4 className="text-lg font-medium text-gray-800 mb-2">
                  🎥 Jitsi Meeting Active
                </h4>
                <div className="text-xs text-blue-600 space-y-1">
                  <p>
                    🎤 Use Jitsi controls for mute, camera, screen share, and
                    more
                  </p>
                  <p>
                    💬 Chat, recording, and other features available in Jitsi
                  </p>
                  <p>🖥️ Screen sharing and presentation mode supported</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <h4 className="text-lg font-medium text-gray-800 mb-2">
                  📞 Jitsi Call Ready
                </h4>
                <p className="text-sm text-gray-500">
                  {callType === "video"
                    ? "Video call will start in Jitsi"
                    : "Audio call will start in Jitsi"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Call Action Buttons */}
        <div className="flex justify-center space-x-4">
          {isIncoming ? (
            <>
              <button
                onClick={handleAccept}
                disabled={isConnecting}
                className="bg-green-500 text-white px-8 py-3 rounded-full font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <IoCall className="inline mr-2" />
                Accept
              </button>
              <button
                onClick={handleDecline}
                disabled={isConnecting}
                className="bg-red-500 text-white px-8 py-3 rounded-full font-medium hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <IoCallOutline className="inline mr-2" />
                Decline
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="bg-red-500 text-white px-8 py-3 rounded-full font-medium hover:bg-red-600 transition-colors"
              >
                <IoCallOutline className="inline mr-2" />
                Cancel
              </button>
              {isCallActive && (
                <button
                  onClick={handleEndCall}
                  className="bg-red-500 text-white px-8 py-3 rounded-full font-medium hover:bg-red-600 transition-colors"
                >
                  <IoCall className="inline mr-2" />
                  End Call
                </button>
              )}
            </>
          )}
        </div>

        {/* Jitsi Container - Show when connecting or active */}
        {(isConnecting || isCallActive) && (
          <div
            ref={jitsiContainerRef}
            id="jitsi-container"
            className="w-full h-96 bg-gray-100 rounded-lg mt-4 border-2 border-dashed border-gray-300"
            style={{
              display: "block",
              minHeight: "400px",
            }}
          >
            {!isCallActive && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🎥</div>
                  <p>Jitsi meeting will appear here...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <IoClose size={24} />
        </button>
      </div>
    </div>
  );
};

export default UnifiedCallDialog;
