import React, { useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";

interface DailyCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  callData: {
    callId: string;
    callerId: string;
    receiverId: string;
    callType: "audio" | "video";
    callerName: string;
    callerAvatar?: string;
    status: "ringing" | "active" | "ended";
    roomUrl?: string;
    token?: string;
  } | null;
  isIncoming?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onEnd?: () => void;
}

const DailyCallDialog: React.FC<DailyCallDialogProps> = ({
  isOpen,
  onClose,
  callData,
  isIncoming = false,
  onAccept,
  onDecline,
  onEnd,
}) => {
  const [callStatus, setCallStatus] = useState<
    "ringing" | "connecting" | "active" | "ended"
  >("ringing");
  const [dailyIframe, setDailyIframe] = useState<any | null>(null);
  const dailyContainerRef = useRef<HTMLDivElement>(null);
  // const [callStartTime, setCallStartTime] = useState<number | null>(null);

  // Generate unique room name
  const generateRoomName = (callerId: string, receiverId: string): string => {
    const sortedIds = [callerId, receiverId].sort();
    return `call-${sortedIds[0]}-${sortedIds[1]}-${Date.now()}`;
  };

  // Generate Daily.co room URL
  const generateDailyRoomUrl = (roomName: string): string => {
    // Replace with your actual Daily.co domain
    return `https://your-domain.daily.co/${roomName}`;
  };

  // Initialize Daily.co iframe
  const initializeDailyIframe = async (roomUrl: string) => {
    if (!dailyContainerRef.current || !callData) return;

    try {
      // Create Daily iframe instance
      const iframe = DailyIframe.createFrame(dailyContainerRef.current, {
        showLeaveButton: false,
        showFullscreenButton: true,
        showLocalVideo: callData.callType === "video",
        showParticipantsBar: true,
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "none",
        },
      });

      // Set up event listeners
      iframe
        .on("loaded", () => {
          console.log("Daily iframe loaded");
        })
        .on("joined-meeting", () => {
          console.log("Joined Daily meeting");
          // setCallStartTime(Date.now());
          setCallStatus("active");
          onAccept?.();
        })
        .on("left-meeting", () => {
          console.log("Left Daily meeting");
          handleEndCall();
        })
        .on("error", (error: any) => {
          console.error("Daily iframe error:", error);
          setCallStatus("ended");
          onClose();
        });

      setDailyIframe(iframe);

      // Join the meeting
      await iframe.join({
        url: roomUrl,
        userName: callData.callerName,
        // startWithAudioMuted: callData.callType === "video" ? false : true,
        // startWithVideoMuted: callData.callType === "audio",
      });
    } catch (error) {
      console.error("Error initializing Daily iframe:", error);
      setCallStatus("ended");
      onClose();
    }
  };

  const handleAcceptCall = async () => {
    if (!callData) return;

    setCallStatus("connecting");

    try {
      // Generate room name and URL
      const roomName = generateRoomName(callData.callerId, callData.receiverId);
      const roomUrl = callData.roomUrl || generateDailyRoomUrl(roomName);

      // Initialize Daily iframe
      await initializeDailyIframe(roomUrl);
    } catch (error) {
      console.error("Error accepting call:", error);
      setCallStatus("ended");
      onClose();
    }
  };

  const handleDeclineCall = async () => {
    if (!callData) return;

    setCallStatus("ended");
    onDecline?.();
    onClose();
  };

  const handleEndCall = async () => {
    setCallStatus("ended");

    if (dailyIframe) {
      try {
        await dailyIframe.leave();
        dailyIframe.destroy();
        setDailyIframe(null);
      } catch (error) {
        console.error("Error ending call:", error);
      }
    }

    onEnd?.();
    onClose();
  };

  const handleStartCall = async () => {
    if (!callData) return;

    setCallStatus("connecting");

    try {
      // Generate room name and URL
      const roomName = generateRoomName(callData.callerId, callData.receiverId);
      const roomUrl = callData.roomUrl || generateDailyRoomUrl(roomName);

      // Initialize Daily iframe
      await initializeDailyIframe(roomUrl);
    } catch (error) {
      console.error("Error starting call:", error);
      setCallStatus("ended");
      onClose();
    }
  };

  // Start call when component mounts (for outgoing calls)
  useEffect(() => {
    if (isOpen && callData && !isIncoming) {
      handleStartCall();
    }
  }, [isOpen, callData, isIncoming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dailyIframe) {
        dailyIframe.destroy();
      }
    };
  }, [dailyIframe]);

  if (!isOpen || !callData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 h-5/6">
        {callStatus === "ringing" && (
          <div className="text-center h-full flex flex-col justify-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isIncoming ? "Incoming Call" : "Calling"}
              </h3>
              <p className="text-gray-600">{callData.callerName}</p>
              <p className="text-sm text-gray-500">
                {callData.callType === "video" ? "Video Call" : "Audio Call"}
              </p>
            </div>

            {isIncoming ? (
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={handleDeclineCall}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Decline</span>
                </button>
                <button
                  onClick={handleAcceptCall}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span>Accept</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={handleDeclineCall}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        )}

        {callStatus === "connecting" && (
          <div className="text-center h-full flex flex-col justify-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Connecting...
              </h3>
              <p className="text-gray-600">Please wait while we connect you</p>
            </div>
          </div>
        )}

        {callStatus === "active" && (
          <div className="h-full flex flex-col">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Call in Progress
              </h3>
              <button
                onClick={handleEndCall}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>End Call</span>
              </button>
            </div>

            <div
              ref={dailyContainerRef}
              id="daily-call-container"
              className="flex-1 w-full bg-gray-100 rounded-lg"
            >
              {/* Daily.co iframe will be rendered here */}
            </div>
          </div>
        )}

        {callStatus === "ended" && (
          <div className="text-center h-full flex flex-col justify-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Call Ended
              </h3>
              <p className="text-gray-600">The call has been disconnected</p>
            </div>

            <button
              onClick={onClose}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyCallDialog;
