import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { endCall } from "../slice/callingSlice";

const WebRTCCall: React.FC = () => {
  const dispatch = useDispatch();
  const { currentCall, roomName, isCallActive } = useSelector(
    (state: RootState) => state.calling
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(
    currentCall?.callType === "audio"
  );
  const [error, setError] = useState<string | null>(null);

  console.log("✅ WebRTCCall: Rendering with data:", {
    isCallActive,
    currentCall,
    roomName,
  });

  useEffect(() => {
    if (!currentCall || !roomName) {
      console.log("🚫 WebRTCCall: Missing required data:", {
        currentCall,
        roomName,
      });
      return;
    }

    console.log("🎯 WebRTCCall: Setting up call", {
      roomName,
      currentCall,
      user: user?.name,
    });

    initializeCall();

    return () => {
      cleanup();
    };
  }, [currentCall, roomName, user]);

  const initializeCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: currentCall?.callType === "video",
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create RTCPeerConnection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          setIsConnected(true);
          console.log("✅ WebRTC connection established");
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to peer via signaling server
          console.log("🧊 ICE candidate:", event.candidate);
        }
      };

      console.log("✅ WebRTC call initialized");
    } catch (err) {
      console.error("❌ Error initializing WebRTC call:", err);
      setError(
        `Failed to initialize call: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsConnected(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    cleanup();
    dispatch(endCall());
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Call Error
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleEndCall}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              End Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative w-full h-full">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gray-900 bg-opacity-75 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {currentCall?.callType === "audio"
                  ? "Audio Call"
                  : "Video Call"}
              </h2>
              <p className="text-sm text-gray-300">
                Call with {currentCall?.callerName}
              </p>
              <p className="text-xs text-gray-400">
                {isConnected ? "Connected" : "Connecting..."}
              </p>
            </div>
            <button
              onClick={handleEndCall}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              End Call
            </button>
          </div>
        </div>

        {/* Video containers */}
        <div className="w-full h-full flex">
          {/* Remote video */}
          <div className="flex-1 relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Connecting...</p>
                </div>
              </div>
            )}
          </div>

          {/* Local video */}
          <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 p-4">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full ${
                isMuted ? "bg-red-600" : "bg-gray-600"
              } text-white`}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>

            {currentCall?.callType === "video" && (
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${
                  isVideoOff ? "bg-red-600" : "bg-gray-600"
                } text-white`}
              >
                {isVideoOff ? "📹" : "📷"}
              </button>
            )}

            <button
              onClick={handleEndCall}
              className="p-3 rounded-full bg-red-600 text-white"
            >
              📞
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebRTCCall;
