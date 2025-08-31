import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { endCall } from "../slice/callingSlice";
import { Socket } from "socket.io-client";
import socketManager from "../services/socketManager";

const WebRTCCall: React.FC = () => {
  console.log("🎯 WebRTCCall: Component rendered");

  const dispatch = useDispatch();
  const { currentCall, roomName, isCallActive } = useSelector(
    (state: RootState) => state.calling
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(
    currentCall?.callType === "audio"
  );
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Initializing...");
  const [isInitiator, setIsInitiator] = useState(false);

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

    // Get socket instance
    const socket = socketManager.getSocket();
    if (!socket) {
      console.error("❌ WebRTCCall: No socket available");
      setError("No socket connection available");
      return;
    }
    socketRef.current = socket;

    // Determine if this user is the initiator (caller)
    const currentUserId = localStorage.getItem("authUser")
      ? JSON.parse(localStorage.getItem("authUser")!)._id
      : null;
    const isCaller = currentUserId === currentCall.callerId;
    setIsInitiator(isCaller);

    console.log("🎯 WebRTCCall: Setting up call", {
      roomName,
      currentCall,
      user: user?.name,
      isInitiator: isCaller,
    });

    initializeCall();
    setupSignalingListeners();

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
        console.log(
          "🔗 WebRTC connection state changed:",
          peerConnection.connectionState
        );
        setConnectionStatus(`Connection: ${peerConnection.connectionState}`);

        if (peerConnection.connectionState === "connected") {
          setIsConnected(true);
          setConnectionStatus("Connected");
          console.log("✅ WebRTC connection established");
        } else if (peerConnection.connectionState === "failed") {
          setConnectionStatus("Connection failed");
          setError("Failed to establish connection");
        } else if (peerConnection.connectionState === "disconnected") {
          setConnectionStatus("Disconnected");
          setIsConnected(false);
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log(
          "🧊 ICE connection state:",
          peerConnection.iceConnectionState
        );
        if (peerConnection.iceConnectionState === "checking") {
          setConnectionStatus("Establishing connection...");
        } else if (peerConnection.iceConnectionState === "connected") {
          setConnectionStatus("Connected");
        } else if (peerConnection.iceConnectionState === "failed") {
          setConnectionStatus("Connection failed");
          setError("ICE connection failed");
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

      // Log connection details
      console.log("🔗 WebRTC connection details:", {
        connectionState: peerConnection.connectionState,
        iceConnectionState: peerConnection.iceConnectionState,
        iceGatheringState: peerConnection.iceGatheringState,
        localDescription: peerConnection.localDescription,
        remoteDescription: peerConnection.remoteDescription,
      });

      // If this user is the initiator, create and send the offer
      if (isInitiator && socketRef.current && currentCall) {
        try {
          console.log("🎯 Creating WebRTC offer as initiator...");
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          // Send offer to the receiver
          socketRef.current.emit("webrtc-offer", {
            targetUserId: currentCall.receiverId,
            offer,
            roomName,
          });
          console.log("✅ WebRTC Offer sent to receiver");
        } catch (err) {
          console.error("❌ Error creating/sending offer:", err);
          setError("Failed to initiate call");
        }
      }
    } catch (err) {
      console.error("❌ Error initializing WebRTC call:", err);
      setError(
        `Failed to initialize call: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const setupSignalingListeners = () => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Listen for WebRTC offers (for the receiver)
    socket.on("webrtc-offer", async (data) => {
      console.log("📡 WebRTC Offer received:", data);
      try {
        const { offer, fromUserId } = data;

        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(offer)
          );
          console.log("✅ Remote description set from offer");

          // Create and send answer
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);

          // Send answer back to the caller
          socket.emit("webrtc-answer", {
            targetUserId: fromUserId,
            answer,
            roomName,
          });
          console.log("✅ WebRTC Answer sent");
        }
      } catch (err) {
        console.error("❌ Error handling WebRTC offer:", err);
        setError("Failed to handle incoming call");
      }
    });

    // Listen for WebRTC answers (for the caller)
    socket.on("webrtc-answer", async (data) => {
      console.log("📡 WebRTC Answer received:", data);
      try {
        const { answer } = data;

        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          console.log("✅ Remote description set from answer");
        }
      } catch (err) {
        console.error("❌ Error handling WebRTC answer:", err);
        setError("Failed to handle call answer");
      }
    });

    // Listen for ICE candidates
    socket.on("webrtc-ice-candidate", async (data) => {
      console.log("📡 WebRTC ICE Candidate received:", data);
      try {
        const { candidate } = data;

        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
          console.log("✅ ICE candidate added");
        }
      } catch (err) {
        console.error("❌ Error adding ICE candidate:", err);
      }
    });
  };

  const cleanup = () => {
    console.log("🧹 WebRTCCall: Cleaning up...");

    // Remove signaling listeners
    if (socketRef.current) {
      socketRef.current.off("webrtc-offer");
      socketRef.current.off("webrtc-answer");
      socketRef.current.off("webrtc-ice-candidate");
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Reset state
    setIsConnected(false);
    setConnectionStatus("Initializing...");
    setError(null);
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
              <p className="text-xs text-gray-400">{connectionStatus}</p>
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
                  <p>{connectionStatus}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {currentCall?.callType === "audio"
                      ? "Audio call"
                      : "Video call"}{" "}
                    with {currentCall?.callerName}
                  </p>
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
