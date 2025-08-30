import React, { useState, useEffect } from "react";
import unifiedCallingService, {
  UnifiedCallData,
} from "../services/unifiedCallingService";
import UnifiedCallDialog from "./ui/unifiedCallDialog";

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

const CallingInterface: React.FC = () => {
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

  useEffect(() => {
    loadUsers();
  }, []);

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
      // TODO: Replace with actual API call to get users from your backend
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
    setShowCallDialog(false);
    setCurrentCall(null);
  };

  const setPreferredPlatform = (platform: "jitsi") => {
    unifiedCallingService.setPreferredPlatform(platform);
    setPlatformStats(unifiedCallingService.getPlatformStats());
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        📞 Video & Audio Calling
      </h1>

      {/* Platform Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Platform Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
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
            <div className="text-2xl mb-2 text-blue-500">🎯</div>
            <div className="text-sm font-medium">System</div>
            <div className="text-xs text-gray-500">Jitsi-Only</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2 text-green-500">✨</div>
            <div className="text-sm font-medium">Quality</div>
            <div className="text-xs text-gray-500">HD Calls</div>
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
          <div className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
            🎯 Jitsi-Only System Active
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-700 mb-2">
            🎯 High-Quality Calling Features
          </h3>
          <div className="text-xs text-blue-600 space-y-1">
            <p>✅ HD video and crystal-clear audio calls</p>
            <p>✅ Built-in screen sharing and presentation mode</p>
            <p>✅ Chat, recording, and livestreaming capabilities</p>
            <p>✅ Works on all devices and browsers</p>
            <p>✅ No additional software installation required</p>
          </div>
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
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Call Type
          </label>
          <div className="flex space-x-4">
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
              <span className="text-sm">Audio Call</span>
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
              <span className="text-sm">Video Call</span>
            </label>
          </div>
        </div>

        {/* Initiate Call Button */}
        <button
          onClick={handleInitiateCall}
          disabled={!selectedUser}
          className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {callType === "video" ? "📹" : "🎵"} Start{" "}
          {callType === "video" ? "Video" : "Audio"} Call
        </button>
      </div>

      {/* Current Call Status */}
      {currentCall && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Active Call
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

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              🎯 Call is active using Jitsi Meet for high-quality communication
            </p>
          </div>
        </div>
      )}

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

export default CallingInterface;
