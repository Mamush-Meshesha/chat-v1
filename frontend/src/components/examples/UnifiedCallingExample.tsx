import React, { useState, useEffect } from "react";
import unifiedCallingService, {
  UnifiedCallData,
} from "../../services/unifiedCallingService";
import UnifiedCallDialog from "../ui/unifiedCallDialog";

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

const UnifiedCallingExample: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [incomingCall, setIncomingCall] = useState<UnifiedCallData | null>(
    null
  );
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [platformStats, setPlatformStats] = useState(
    unifiedCallingService.getPlatformStats()
  );
  const [currentCall, setCurrentCall] = useState<UnifiedCallData | null>(null);

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Setup unified calling service callbacks
  useEffect(() => {
    unifiedCallingService.onIncomingCall = (data) => {
      console.log("📞 Incoming call received:", data);
      setIncomingCall(data);
      setShowIncomingCall(true);
    };

    unifiedCallingService.onCallConnected = (data) => {
      console.log("🎉 Call connected:", data);
      setCurrentCall(data);
    };

    unifiedCallingService.onCallEnded = (data) => {
      console.log("🎵 Call ended:", data);
      setCurrentCall(null);
      setShowCallDialog(false);
      setShowIncomingCall(false);
    };

    unifiedCallingService.onCallFailed = (data) => {
      console.log("💥 Call failed:", data);
      setCurrentCall(null);
      setShowCallDialog(false);
      setShowIncomingCall(false);
    };

    unifiedCallingService.onPlatformChanged = (platform) => {
      console.log("🔄 Platform changed to:", platform);
      setPlatformStats(unifiedCallingService.getPlatformStats());
    };

    return () => {
      unifiedCallingService.onIncomingCall = undefined;
      unifiedCallingService.onCallConnected = undefined;
      unifiedCallingService.onCallEnded = undefined;
      unifiedCallingService.onCallFailed = undefined;
      unifiedCallingService.onPlatformChanged = undefined;
    };
  }, []);

  const loadUsers = async () => {
    try {
      // Simulate loading users (replace with actual API call)
      const mockUsers: User[] = [
        {
          _id: "user1",
          name: "John Doe",
          email: "john@example.com",
          avatar: "/profile.jpg",
        },
        {
          _id: "user2",
          name: "Jane Smith",
          email: "jane@example.com",
          avatar: "/profile.jpg",
        },
        {
          _id: "user3",
          name: "Bob Johnson",
          email: "bob@example.com",
          avatar: "/profile.jpg",
        },
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const handleInitiateCall = async () => {
    if (!selectedUser) {
      alert("Please select a user to call");
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    if (!currentUser._id) {
      alert("Please log in to make calls");
      return;
    }

    try {
      const success = await unifiedCallingService.initiateCall({
        callerId: currentUser._id,
        receiverId: selectedUser._id,
        callType,
        callerName: currentUser.name || "Caller",
        callerAvatar: currentUser.avatar || "/profile.jpg",
      });

      if (success) {
        console.log("Call initiated successfully");
        setShowCallDialog(true);
      } else {
        alert("Failed to initiate call");
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      alert("Error initiating call");
    }
  };

  const handleAcceptIncomingCall = () => {
    if (incomingCall) {
      setShowIncomingCall(false);
      setShowCallDialog(true);
    }
  };

  const handleDeclineIncomingCall = () => {
    if (incomingCall) {
      unifiedCallingService.declineCall(incomingCall);
      setShowIncomingCall(false);
      setIncomingCall(null);
    }
  };

  const handleCallEnded = () => {
    setCurrentCall(null);
    setShowCallDialog(false);
    setShowIncomingCall(false);
    setIncomingCall(null);
  };

  const handlePlatformSwitch = async (targetPlatform: "jitsi" | "webrtc") => {
    try {
      const success = await unifiedCallingService.switchPlatform(
        targetPlatform
      );
      if (success) {
        alert(`Successfully switched to ${targetPlatform.toUpperCase()}`);
      } else {
        alert(`Failed to switch to ${targetPlatform.toUpperCase()}`);
      }
    } catch (error) {
      console.error("Error switching platform:", error);
      alert("Error switching platform");
    }
  };

  const setPreferredPlatform = (platform: "jitsi" | "webrtc") => {
    unifiedCallingService.setPreferredPlatform(platform);
    setPlatformStats(unifiedCallingService.getPlatformStats());
  };

  const toggleFallback = () => {
    const currentFallback = platformStats.fallbackEnabled;
    unifiedCallingService.setFallbackToWebRTC(!currentFallback);
    setPlatformStats(unifiedCallingService.getPlatformStats());
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Unified Calling System Example
      </h1>

      {/* Platform Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Platform Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div
              className={`text-2xl mb-2 ${
                platformStats.jitsiAvailable ? "text-green-500" : "text-red-500"
              }`}
            >
              {platformStats.jitsiAvailable ? "✅" : "❌"}
            </div>
            <div className="text-sm font-medium">Jitsi</div>
            <div className="text-xs text-gray-500">
              {platformStats.jitsiAvailable ? "Available" : "Not Available"}
            </div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl mb-2 ${
                platformStats.webrtcAvailable
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {platformStats.webrtcAvailable ? "✅" : "❌"}
            </div>
            <div className="text-sm font-medium">WebRTC</div>
            <div className="text-xs text-gray-500">
              {platformStats.webrtcAvailable ? "Available" : "Not Available"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2 text-blue-500">🎯</div>
            <div className="text-sm font-medium">Recommended</div>
            <div className="text-xs text-gray-500 capitalize">
              {platformStats.recommended}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2 text-purple-500">⭐</div>
            <div className="text-sm font-medium">Preferred</div>
            <div className="text-xs text-gray-500 capitalize">
              {platformStats.preferred}
            </div>
          </div>
        </div>

        {/* Platform Controls */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setPreferredPlatform("jitsi")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              platformStats.preferred === "jitsi"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Set Jitsi as Preferred
          </button>
          <button
            onClick={() => setPreferredPlatform("webrtc")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              platformStats.preferred === "webrtc"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Set WebRTC as Preferred
          </button>
          <button
            onClick={toggleFallback}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              platformStats.fallbackEnabled
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {platformStats.fallbackEnabled ? "Disable" : "Enable"} Fallback
          </button>
        </div>
      </div>

      {/* Call Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Make a Call
        </h2>

        {/* User Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select User to Call
          </label>
          <select
            value={selectedUser?._id || ""}
            onChange={(e) => {
              const user = users.find((u) => u._id === e.target.value);
              setSelectedUser(user || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a user...</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        {/* Call Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Call Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="audio"
                checked={callType === "audio"}
                onChange={(e) =>
                  setCallType(e.target.value as "audio" | "video")
                }
                className="mr-2"
              />
              Audio Call
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="video"
                checked={callType === "video"}
                onChange={(e) =>
                  setCallType(e.target.value as "audio" | "video")
                }
                className="mr-2"
              />
              Video Call
            </label>
          </div>
        </div>

        {/* Initiate Call Button */}
        <button
          onClick={handleInitiateCall}
          disabled={!selectedUser}
          className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {callType === "video" ? "📹" : "🎵"} Initiate{" "}
          {callType === "video" ? "Video" : "Audio"} Call
        </button>
      </div>

      {/* Current Call Status */}
      {currentCall && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Current Call
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-600">Status</div>
              <div className="text-lg font-semibold capitalize">
                {currentCall.status}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Platform</div>
              <div className="text-lg font-semibold uppercase">
                {currentCall.platform}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Call Type</div>
              <div className="text-lg font-semibold capitalize">
                {currentCall.callType}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Room Name</div>
              <div className="text-sm font-mono text-gray-600 truncate">
                {currentCall.roomName || "N/A"}
              </div>
            </div>
          </div>

          {/* Platform Switching */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-2">
              Switch Platform
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePlatformSwitch("jitsi")}
                disabled={
                  !platformStats.jitsiAvailable ||
                  currentCall.platform === "jitsi"
                }
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
              >
                Switch to Jitsi
              </button>
              <button
                onClick={() => handlePlatformSwitch("webrtc")}
                disabled={
                  !platformStats.webrtcAvailable ||
                  currentCall.platform === "webrtc"
                }
                className="px-3 py-1 text-sm bg-green-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
              >
                Switch to WebRTC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Information */}
      <div className="bg-gray-100 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          Debug Information
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div>Current Call: {currentCall ? "Active" : "None"}</div>
          <div>Platform Stats: {JSON.stringify(platformStats, null, 2)}</div>
          <div>Selected User: {selectedUser?.name || "None"}</div>
          <div>Call Type: {callType}</div>
        </div>
      </div>

      {/* Call Dialogs */}
      {showCallDialog && (
        <UnifiedCallDialog
          isOpen={showCallDialog}
          onClose={() => setShowCallDialog(false)}
          callType={callType}
          callerName={selectedUser?.name || "Unknown"}
          callerAvatar={selectedUser?.avatar}
          isIncoming={false}
          callData={currentCall || undefined}
          onCallEnded={handleCallEnded}
        />
      )}

      {showIncomingCall && incomingCall && (
        <UnifiedCallDialog
          isOpen={showIncomingCall}
          onClose={() => setShowIncomingCall(false)}
          callType={incomingCall.callType}
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          isIncoming={true}
          callData={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
          onCallEnded={handleCallEnded}
        />
      )}
    </div>
  );
};

export default UnifiedCallingExample;
