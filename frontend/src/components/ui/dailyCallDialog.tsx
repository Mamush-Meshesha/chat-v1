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
  const [isInitializing, setIsInitializing] = useState(false);
  // const [callStartTime, setCallStartTime] = useState<number | null>(null);

  // Generate unique room name
  const generateRoomName = (_callerId: string, _receiverId: string): string => {
    // Use a simpler room name format that works better with Daily.co
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    return `room-${timestamp}-${randomId}`;
  };

  // Create Daily.co room using API (unused for now)
  // const createDailyRoom = async (roomName: string): Promise<string | null> => {
  //   try {
  //     console.log("🏗️ Creating Daily.co room:", roomName);
  //
  //     // For now, we'll use a simple approach - try to join directly
  //     // In production, you would call your backend API to create the room
  //     const roomUrl = `https://cloud-48b3ae2ced424673a4d45f40a71e7be7.daily.co/${roomName}`;
  //
  //     // Test if room exists by making a simple request
  //     const response = await fetch(roomUrl, { method: 'HEAD' });
  //
  //     if (response.ok) {
  //       console.log("✅ Room exists:", roomUrl);
  //       return roomUrl;
  //     } else {
  //       console.log("⚠️ Room doesn't exist, will be created on first join:", roomUrl);
  //       return roomUrl;
  //     }
  //   } catch (error) {
  //     console.log("⚠️ Error checking room, proceeding with URL:", error);
  //     return `https://cloud-48b3ae2ced424673a4d45f40a71e7be7.daily.co/${roomName}`;
  //   }
  // };

  // Create Daily.co room via backend API
  const createDailyRoom = async (roomName: string): Promise<string | null> => {
    try {
      console.log("🏗️ Creating Daily.co room via API:", roomName);

      const response = await fetch(
        `${
          process.env.REACT_APP_API_BASE_URL || "https://mam-98fa.onrender.com"
        }/api/daily/create-room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomName }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.room) {
        console.log("✅ Daily.co room created successfully:", data.room.url);
        return data.room.url;
      } else {
        throw new Error(data.error || "Failed to create room");
      }
    } catch (error) {
      console.error("❌ Error creating Daily.co room:", error);
      return null;
    }
  };

  // Generate Daily.co room URL (fallback)
  const generateDailyRoomUrl = (roomName: string): string => {
    const url = `https://cloud-48b3ae2ced424673a4d45f40a71e7be7.daily.co/${roomName}`;
    console.log("🔗 Generated Daily.co room URL (fallback):", url);
    return url;
  };

  // Initialize Daily.co iframe
  const initializeDailyIframe = async (roomName: string) => {
    // Prevent multiple simultaneous initializations
    if (isInitializing) {
      console.log("⚠️ Already initializing iframe, skipping...");
      return;
    }

    setIsInitializing(true);

    // Check if iframe already exists
    if (dailyIframe) {
      console.log("⚠️ Daily iframe already exists, cleaning up first...");
      try {
        await dailyIframe.leave();
        dailyIframe.destroy();
        setDailyIframe(null);
      } catch (error) {
        console.log("Error cleaning up existing iframe:", error);
      }
    }

    // Wait for container to be available
    let attempts = 0;
    const maxAttempts = 10;

    while (!dailyContainerRef.current && attempts < maxAttempts) {
      console.log(
        `⏳ Waiting for container... attempt ${attempts + 1}/${maxAttempts}`
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!dailyContainerRef.current || !callData) {
      console.error("❌ Missing container or call data:", {
        container: !!dailyContainerRef.current,
        callData: !!callData,
        attempts: attempts,
      });
      return;
    }

    // First, create the room via API
    const roomUrl = await createDailyRoom(roomName);

    if (!roomUrl) {
      console.error("❌ Failed to create Daily.co room, using fallback URL");
      const fallbackUrl = generateDailyRoomUrl(roomName);
      console.log("🔄 Using fallback URL:", fallbackUrl);
    }

    console.log("🚀 Initializing Daily.co iframe with:", {
      roomUrl: roomUrl || generateDailyRoomUrl(roomName),
      callData: {
        callerName: callData.callerName,
        callType: callData.callType,
        callId: callData.callId,
      },
    });

    try {
      console.log("🔄 Creating Daily iframe...");

      // Create Daily iframe instance with instant room creation
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
        // Note: Daily.co will create rooms automatically when joined
      });

      console.log("✅ Daily iframe created successfully");

      // Set up event listeners
      iframe
        .on("loaded", () => {
          console.log("📱 Daily iframe loaded");
        })
        .on("joined-meeting", () => {
          console.log("🎉 Joined Daily meeting successfully");
          // setCallStartTime(Date.now());
          setCallStatus("active");
          onAccept?.();
        })
        .on("left-meeting", () => {
          console.log("👋 Left Daily meeting");
          handleEndCall();
        })
        .on("error", (error: any) => {
          console.error("❌ Daily iframe error:", error);
          setCallStatus("ended");
          onClose();
        });

      setDailyIframe(iframe);

      console.log("🔄 Attempting to join meeting...");

      // Join the meeting
      await iframe.join({
        url: roomUrl || generateDailyRoomUrl(roomName),
        userName: callData.callerName,
        // startWithAudioMuted: callData.callType === "video" ? false : true,
        // startWithVideoMuted: callData.callType === "audio",
      });

      console.log("✅ Join request sent successfully");
    } catch (error) {
      console.error("❌ Error initializing Daily iframe:", error);
      setCallStatus("ended");
      onClose();
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAcceptCall = async () => {
    if (!callData) return;

    setCallStatus("connecting");

    try {
      // Generate room name
      const roomName = generateRoomName(callData.callerId, callData.receiverId);

      // Set call status to active first, then initialize iframe
      setCallStatus("active");

      // Wait a bit for the DOM to update, then initialize iframe
      setTimeout(() => {
        initializeDailyIframe(roomName);
      }, 100);
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
      // Generate room name
      const roomName = generateRoomName(callData.callerId, callData.receiverId);

      // Set call status to active first, then initialize iframe
      setCallStatus("active");

      // Wait a bit for the DOM to update, then initialize iframe
      setTimeout(() => {
        initializeDailyIframe(roomName);
      }, 100);
    } catch (error) {
      console.error("Error starting call:", error);
      setCallStatus("ended");
      onClose();
    }
  };

  // Start call when component mounts (for outgoing calls)
  useEffect(() => {
    if (isOpen && callData && !isIncoming) {
      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        handleStartCall();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, callData, isIncoming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dailyIframe) {
        console.log("🧹 Cleaning up Daily iframe on unmount");
        try {
          dailyIframe.destroy();
        } catch (error) {
          console.log("Error destroying iframe:", error);
        }
      }
      setIsInitializing(false);
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
