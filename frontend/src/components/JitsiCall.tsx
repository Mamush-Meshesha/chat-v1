import React, { useEffect, useRef, useState } from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { endCall } from "../slice/callingSlice";

const JitsiCall: React.FC = () => {
  const dispatch = useDispatch();
  const { currentCall, roomName } = useSelector(
    (state: RootState) => state.calling
  );
  const { user } = useSelector((state: RootState) => state.auth);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiError, setJitsiError] = useState<string | null>(null);
  const [mediaPermission, setMediaPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (!currentCall || !roomName) {
      return;
    }

    console.log("🎯 JitsiCall: Setting up Jitsi meeting", {
      roomName,
      currentCall,
      user: user?.name,
    });

    // Check media permissions
    checkMediaPermissions();
  }, [currentCall, roomName, user]);

  const checkMediaPermissions = async () => {
    try {
      if (currentCall?.callType === "video") {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoStream.getTracks().forEach((track) => track.stop());
        setMediaPermission(true);
      } else {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioStream.getTracks().forEach((track) => track.stop());
        setMediaPermission(true);
      }
    } catch (error) {
      console.error("❌ Media permission error:", error);
      setMediaPermission(false);
      setJitsiError(
        `Media permission denied: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleApiReady = (externalApi: any) => {
    console.log("✅ Jitsi API ready:", externalApi);
    setJitsiError(null);

    try {
      // Configure Jitsi API
      externalApi.executeCommand("displayName", user?.name || "User");
      console.log("✅ Display name set to:", user?.name || "User");

      // Listen for participant joined
      externalApi.addEventListeners({
        participantJoined: () => {
          console.log("👤 Participant joined the meeting");
        },
        participantLeft: () => {
          console.log("👤 Participant left the meeting");
        },
        videoConferenceJoined: () => {
          console.log("🎉 User joined the video conference");
        },
        videoConferenceLeft: () => {
          console.log("🔚 User left the video conference");
          dispatch(endCall());
        },
        conferenceFailed: (event: any) => {
          console.error("❌ Conference failed:", event);
          setJitsiError(`Conference failed: ${event.error || "Unknown error"}`);
        },
        mediaError: (event: any) => {
          console.error("❌ Media error:", event);
          setJitsiError(`Media error: ${event.error || "Unknown error"}`);
        },
        // Add more event listeners for debugging
        conferenceJoined: () => {
          console.log("🎉 Conference joined successfully");
        },
        conferenceWillJoin: () => {
          console.log("🔄 Conference will join...");
        },
        conferenceTerminated: () => {
          console.log("🔚 Conference terminated");
        },
        audioMuteStatusChanged: (event: any) => {
          console.log("🔇 Audio mute status changed:", event.muted);
        },
        videoMuteStatusChanged: (event: any) => {
          console.log("📹 Video mute status changed:", event.muted);
        },
      });

      console.log("✅ All event listeners added successfully");
    } catch (error) {
      console.error("❌ Error setting up Jitsi API:", error);
      setJitsiError(`Setup error: ${error}`);
    }
  };

  const handleReadyToClose = () => {
    console.log("🔚 Jitsi ready to close");
    dispatch(endCall());
  };

  if (!currentCall || !roomName) {
    return null;
  }

  // Show error if media permissions are denied
  if (mediaPermission === false) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="bg-gray-900 p-6 rounded-lg text-white text-center">
          <h2 className="text-xl font-semibold mb-4">
            Media Permission Required
          </h2>
          <p className="mb-4">
            {currentCall.callType === "video"
              ? "Camera and microphone access is required for video calls."
              : "Microphone access is required for audio calls."}
          </p>
          <button
            onClick={() => checkMediaPermissions()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mr-2"
          >
            Try Again
          </button>
          <button
            onClick={() => dispatch(endCall())}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            End Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative w-full h-full">
        {/* Header with call info */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gray-900 bg-opacity-75 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {currentCall.callType === "audio" ? "Audio Call" : "Video Call"}
              </h2>
              <p className="text-sm text-gray-300">
                Call ID: {currentCall.callId}
              </p>
              {jitsiError && (
                <p className="text-sm text-red-400 mt-1">Error: {jitsiError}</p>
              )}
            </div>
            <button
              onClick={() => dispatch(endCall())}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              End Call
            </button>
          </div>
        </div>

        {/* Jitsi container */}
        <div
          ref={jitsiContainerRef}
          className="w-full h-full"
          id="jitsi-container"
        >
          <JitsiMeeting
            domain="meet.jit.si"
            roomName={roomName}
            configOverwrite={{
              startWithAudioMuted: false,
              startWithVideoMuted: currentCall.callType === "audio",
              startAudioOnly: currentCall.callType === "audio",
              startSilent: false,
              // Only essential settings
              enableLobby: false,
              authenticationMode: "none",
              // Basic media settings
              resolution: 720,
              maxFullResolutionParticipants: 2,
              // Disable unnecessary features
              fileRecordingsEnabled: false,
              liveStreamingEnabled: false,
            }}
            interfaceConfigOverwrite={{
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
              TOOLBAR_ALWAYS_VISIBLE: true,
              VERTICAL_FILMSTRIP: false,
            }}
            userInfo={{
              displayName: user?.name || "User",
              email: user?.email || "user@example.com",
            }}
            onApiReady={handleApiReady}
            onReadyToClose={handleReadyToClose}
            getIFrameRef={(iframeRef) => {
              if (iframeRef) {
                iframeRef.style.height = "100%";
                iframeRef.style.width = "100%";
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default JitsiCall;
