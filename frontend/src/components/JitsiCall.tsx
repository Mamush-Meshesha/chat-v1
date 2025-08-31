import React, { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!currentCall || !roomName) {
      return;
    }

    console.log("🎯 JitsiCall: Setting up Jitsi meeting", {
      roomName,
      currentCall,
      user: user?.name,
    });
  }, [currentCall, roomName, user]);

  const handleApiReady = (externalApi: any) => {
    console.log("✅ Jitsi API ready:", externalApi);

    // Configure Jitsi API
    externalApi.executeCommand("displayName", user?.name || "User");

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
    });
  };

  const handleReadyToClose = () => {
    console.log("🔚 Jitsi ready to close");
    dispatch(endCall());
  };

  if (!currentCall || !roomName) {
    return null;
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
              disableAudioLevels: false,
              maxFullResolutionParticipants: 2,
              maxThumbnails: 2,
              disableModeratorIndicator: true,
              enableLobbyChat: false,
              disable1On1Mode: false,
              fileRecordingsEnabled: false,
              liveStreamingEnabled: false,
              chatEnabled: true,
              desktopSharingEnabled: true,
              desktopSharingSources: ["screen", "window", "tab"],
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
              iframeRef.style.height = "100%";
              iframeRef.style.width = "100%";
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default JitsiCall;
