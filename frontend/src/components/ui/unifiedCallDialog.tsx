import { FC, useState, useEffect, useRef } from "react";
import {
  IoCall,
  IoCallOutline,
  IoClose,
  IoMic,
  IoMicOff,
  IoVideocam,
  IoVideocamOff,
} from "react-icons/io5";
import { BsThreeDots } from "react-icons/bs";
import { IoDesktop } from "react-icons/io5";
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
  callerAvatar = "/profile.jpg",
  isIncoming = false,
  onAccept,
  onDecline,
  onEndCall,
  onCancel,
  callData,
  onCallEnded,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<
    "jitsi" | "webrtc" | null
  >(null);
  const [platformStats, setPlatformStats] = useState(
    unifiedCallingService.getPlatformStats()
  );
  const [showPlatformInfo, setShowPlatformInfo] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const durationRef = useRef<number | null>(null);

  // Handle incoming call
  useEffect(() => {
    if (isIncoming && isOpen) {
      console.log("🔔 Incoming unified call");
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
      console.log("🎉 UnifiedCallDialog: Call connected:", data);
      setIsConnecting(false);
      setIsCallActive(true);
      setCurrentPlatform(data.platform || "jitsi");
      setCallDuration(0);

      // Get streams for WebRTC calls
      if (data.platform === "webrtc") {
        const localStream = unifiedCallingService.getLocalStream();
        const remoteStream = unifiedCallingService.getRemoteStream();
        setLocalStream(localStream);
        setRemoteStream(remoteStream);
      }
    };

    unifiedCallingService.onCallEnded = (data) => {
      console.log("🎵 UnifiedCallDialog: Call ended:", data);
      setIsCallActive(false);
      setCallDuration(0);
      setLocalStream(null);
      setRemoteStream(null);
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

    unifiedCallingService.onRemoteStream = (stream) => {
      console.log("🎵 UnifiedCallDialog: Remote stream received:", stream);
      setRemoteStream(stream);
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
      unifiedCallingService.onRemoteStream = undefined;
      unifiedCallingService.onPlatformChanged = undefined;
    };
  }, [onCallEnded]);

  // Update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((error) => {
        console.error("❌ Local video play failed:", error);
      });
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((error) => {
        console.error("❌ Remote video play failed:", error);
      });
    }
  }, [remoteStream]);

  // Update audio elements when streams change
  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
      localAudioRef.current.muted = true; // Mute local audio to prevent echo
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch((error) => {
        console.error("❌ Remote audio play failed:", error);
      });
    }
  }, [remoteStream]);

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
    console.log("🔄 UnifiedCallDialog: Accepting call...");
    console.log("🔄 UnifiedCallDialog: callData:", callData);

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

        // Join the meeting if it's a Jitsi call
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
            // Fallback to WebRTC if Jitsi fails
            if (platformStats.webrtcAvailable) {
              console.log("🔄 Falling back to WebRTC...");
              await unifiedCallingService.switchPlatform("webrtc");
            }
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
    console.log("🔄 UnifiedCallDialog: Declining call...");

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
    console.log("🔄 UnifiedCallDialog: Cancelling call...");

    try {
      await unifiedCallingService.endCall();
    } catch (error) {
      console.error("❌ Error cancelling call:", error);
    }

    if (onCancel) onCancel();
    onClose();
  };

  const handleEndCall = async () => {
    console.log("🔄 UnifiedCallDialog: Ending call...");

    try {
      await unifiedCallingService.endCall();
    } catch (error) {
      console.error("❌ Error ending call:", error);
    }

    if (onEndCall) onEndCall();
    onClose();
  };

  // Handle platform switching
  const handlePlatformSwitch = async (targetPlatform: "jitsi" | "webrtc") => {
    try {
      const success = await unifiedCallingService.switchPlatform(
        targetPlatform
      );
      if (success) {
        console.log(`✅ Successfully switched to ${targetPlatform}`);
      } else {
        console.error(`❌ Failed to switch to ${targetPlatform}`);
      }
    } catch (error) {
      console.error("❌ Error switching platform:", error);
    }
  };

  // Toggle mute (for WebRTC calls)
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video (for WebRTC calls)
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Handle screen sharing (for WebRTC calls)
  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        console.log("🖥️ Stopping screen share...");
        // Implement screen share stop logic
        setIsScreenSharing(false);
      } else {
        console.log("🖥️ Starting screen share...");
        // Implement screen share start logic
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error("❌ Screen share error:", error);
    }
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
                      onClick={() => handlePlatformSwitch("jitsi")}
                      disabled={
                        !platformStats.jitsiAvailable ||
                        currentPlatform === "jitsi"
                      }
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
                    >
                      Switch to Jitsi
                    </button>
                    <button
                      onClick={() => handlePlatformSwitch("webrtc")}
                      disabled={
                        !platformStats.webrtcAvailable ||
                        currentPlatform === "webrtc"
                      }
                      className="px-2 py-1 text-xs bg-green-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600"
                    >
                      Switch to WebRTC
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video/Audio Display */}
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
          ) : isCallActive && currentPlatform === "webrtc" ? (
            <div className="relative bg-gray-100 rounded-lg overflow-hidden h-96">
              {/* Local Video */}
              {callType === "video" && localStream && (
                <div className="absolute top-2 right-2 w-32 h-24 bg-gray-800 rounded overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                    You
                  </div>
                </div>
              )}

              {/* Remote Video */}
              {callType === "video" && remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📹</div>
                    <p className="text-gray-600">WebRTC Video Call Active</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {remoteStream
                        ? "Remote video connected"
                        : "Waiting for remote video..."}
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                WebRTC Active
              </div>
            </div>
          ) : isConnecting ? (
            <div className="relative bg-gray-100 rounded-lg overflow-hidden h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-blue-600 text-lg">
                  {currentPlatform === "jitsi"
                    ? "Connecting to Jitsi meeting..."
                    : "Establishing WebRTC connection..."}
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

        {/* Platform-specific Features Info */}
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

        {currentPlatform === "webrtc" && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-medium text-green-700 mb-2">
              🎯 WebRTC Features Available:
            </h4>
            <div className="text-xs text-green-600 space-y-1">
              <p>🎤 Use device controls for mute, camera, and screen share</p>
              <p>📹 Direct peer-to-peer connection for low latency</p>
              <p>🖥️ Screen sharing available through browser</p>
              <p>🔒 End-to-end encrypted communication</p>
            </div>
          </div>
        )}

        {/* Call Controls (for WebRTC calls) */}
        {isCallActive &&
          currentPlatform === "webrtc" &&
          callType === "video" && (
            <div className="flex justify-center space-x-4 mb-6">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors duration-200 ${
                  isMuted
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <IoMicOff size={24} /> : <IoMic size={24} />}
              </button>

              {/* Video Toggle Button */}
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-colors duration-200 ${
                  isVideoOff
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                title={isVideoOff ? "Turn on video" : "Turn off video"}
              >
                {isVideoOff ? (
                  <IoVideocamOff size={24} />
                ) : (
                  <IoVideocam size={24} />
                )}
              </button>

              {/* Screen Share Button */}
              <button
                onClick={handleScreenShare}
                className={`p-4 rounded-full transition-colors duration-200 ${
                  isScreenSharing
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                title={isScreenSharing ? "Stop sharing" : "Share screen"}
              >
                <IoDesktop size={24} />
              </button>

              {/* More Options */}
              <button
                className="p-4 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200"
                title="More options"
              >
                <BsThreeDots size={24} />
              </button>
            </div>
          )}

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

        {/* Hidden audio elements for WebRTC calls */}
        <audio
          ref={localAudioRef}
          autoPlay
          muted
          playsInline
          style={{ display: "none" }}
        />
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
};

export default UnifiedCallDialog;
