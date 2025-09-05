import { FC, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import axios from "axios";
import { MdOutlineCall, MdOutlineCallEnd } from "react-icons/md";
import { FiSearch, FiFilter } from "react-icons/fi";
import DailyCallDialog from "./ui/dailyCallDialog";

interface CallRecord {
  id: string;
  name: string;
  type: "incoming" | "outgoing" | "missed";
  callType: "audio" | "video";
  duration: string;
  date: string;
  time: string;
  avatar?: string;
  userId?: string;
}

interface ChatHeaderProps {}

const CallingHeader: FC<ChatHeaderProps> = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "incoming" | "outgoing" | "missed"
  >("all");
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Call dialog state
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [currentCall, setCurrentCall] = useState<{
    callId: string;
    callerId: string;
    receiverId: string;
    callType: "audio" | "video";
    callerName: string;
    callerAvatar?: string;
    status: "ringing" | "active" | "ended";
    roomUrl?: string;
    token?: string;
  } | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);

  const authUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  // Fetch real call history from backend
  useEffect(() => {
    if (isAuthenticated && authUser) {
      fetchCallHistory();
    }
  }, [isAuthenticated, authUser]);

  // Listen for call ended events to refresh call history
  useEffect(() => {
    const handleCallEnded = () => {
      console.log("🔄 Call ended event received, refreshing call history...");
      fetchCallHistory();
    };

    // Listen for custom call ended events
    window.addEventListener("callEnded", handleCallEnded);

    return () => {
      window.removeEventListener("callEnded", handleCallEnded);
    };
  }, []);

  const fetchCallHistory = async () => {
    try {
      setLoading(true);

      // Get token from localStorage
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Try to fetch call history from your backend API
      const response = await axios.get(
        "http://localhost:5300/api/calls/history",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setCallHistory(response.data.calls);
      } else {
        // If no call history endpoint, create sample data from users
        const usersResponse = await axios.get(
          "http://localhost:5300/api/users",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // The backend returns an array directly, not wrapped in success/users
        if (Array.isArray(usersResponse.data)) {
          // Create sample call history from other users
          if (authUser) {
            const currentUser = JSON.parse(authUser);
            const otherUsers = usersResponse.data.filter(
              (user: any) => user._id !== currentUser._id
            );

            const sampleCalls: CallRecord[] = otherUsers
              .slice(0, 5)
              .map((user: any, index: number) => ({
                id: `call_${index + 1}`,
                name: user.name,
                type:
                  index % 3 === 0
                    ? "incoming"
                    : index % 3 === 1
                    ? "outgoing"
                    : "missed",
                callType: index % 2 === 0 ? "audio" : "video",
                duration:
                  index % 3 === 2
                    ? "0:00"
                    : `${Math.floor(Math.random() * 10) + 1}:${Math.floor(
                        Math.random() * 60
                      )
                        .toString()
                        .padStart(2, "0")}`,
                date: new Date(
                  Date.now() - index * 24 * 60 * 60 * 1000
                ).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                time: new Date(
                  Date.now() - index * 24 * 60 * 60 * 1000
                ).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }),
                userId: user._id || `user_${index}`,
              }));

            setCallHistory(sampleCalls);
          } else {
            setCallHistory([]);
          }
        } else if (usersResponse.data.success && usersResponse.data.users) {
          // If backend returns success/users format
          if (authUser) {
            const currentUser = JSON.parse(authUser);
            const otherUsers = usersResponse.data.users.filter(
              (user: any) => user._id !== currentUser._id
            );

            const sampleCalls: CallRecord[] = otherUsers
              .slice(0, 5)
              .map((user: any, index: number) => ({
                id: `call_${index + 1}`,
                name: user.name,
                type:
                  index % 3 === 0
                    ? "incoming"
                    : index % 3 === 1
                    ? "outgoing"
                    : "missed",
                callType: index % 2 === 0 ? "audio" : "video",
                duration:
                  index % 3 === 2
                    ? "0:00"
                    : `${Math.floor(Math.random() * 10) + 1}:${Math.floor(
                        Math.random() * 60
                      )
                        .toString()
                        .padStart(2, "0")}`,
                date: new Date(
                  Date.now() - index * 24 * 60 * 60 * 1000
                ).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                time: new Date(
                  Date.now() - index * 24 * 60 * 60 * 1000
                ).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }),
                userId: user._id || `user_${index}`,
              }));

            setCallHistory(sampleCalls);
          } else {
            setCallHistory([]);
          }
        } else {
          setCallHistory([]);
        }
      }
    } catch (error) {
      console.error("Error fetching call history:", error);
      setError("Failed to load call history");
      setCallHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // If not authenticated, show loading
  if (!isAuthenticated || !authUser) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading call history...</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading call history...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchCallHistory();
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getCallIcon = (type: string, callType: string) => {
    if (type === "missed") {
      return <MdOutlineCallEnd className="text-red-500 text-lg" />;
    }
    if (callType === "video") {
      return <MdOutlineCall className="text-blue-500 text-lg" />;
    }
    return <MdOutlineCall className="text-green-500 text-lg" />;
  };

  const getCallTypeColor = (type: string) => {
    switch (type) {
      case "incoming":
        return "text-green-600";
      case "outgoing":
        return "text-blue-600";
      case "missed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getCallTypeText = (type: string) => {
    switch (type) {
      case "incoming":
        return "Incoming";
      case "outgoing":
        return "Outgoing";
      case "missed":
        return "Missed";
      default:
        return "Unknown";
    }
  };

  const filteredCalls = callHistory.filter((call) => {
    const matchesSearch = call.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || call.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleCallBack = async (call: CallRecord) => {
    console.log("Calling back:", call.name);

    if (!call.userId || !authUser) {
      console.error("Missing user ID or auth user");
      return;
    }

    try {
      // Generate unique room name
      const generateRoomName = (
        callerId: string,
        receiverId: string
      ): string => {
        const sortedIds = [callerId, receiverId].sort();
        return `call-${sortedIds[0]}-${sortedIds[1]}-${Date.now()}`;
      };

      // Generate Daily.co room URL
      const generateDailyRoomUrl = (roomName: string): string => {
        // Replace with your actual Daily.co domain
        return `https://your-domain.daily.co/${roomName}`;
      };

      // Prepare call data
      const roomName = generateRoomName(authUser._id, call.userId);
      const roomUrl = generateDailyRoomUrl(roomName);

      const callData = {
        callId: `${authUser._id}-${call.userId}-${Date.now()}`,
        callerId: authUser._id,
        receiverId: call.userId,
        callType: call.callType,
        callerName: authUser.name || (authUser as any).username,
        callerAvatar: (authUser as any).avatar,
        status: "ringing" as const,
        roomUrl: roomUrl,
      };

      setCurrentCall(callData);
      setIsIncomingCall(false);
      setIsCallDialogOpen(true);
    } catch (error) {
      console.error("Error initiating call:", error);
    }
  };

  const handleAcceptCall = () => {
    console.log("Call accepted");
    // The Daily dialog will handle the actual call acceptance
  };

  const handleDeclineCall = () => {
    console.log("Call declined");
    setIsCallDialogOpen(false);
    setCurrentCall(null);
  };

  const handleEndCall = () => {
    console.log("Call ended");
    setIsCallDialogOpen(false);
    setCurrentCall(null);
    // Refresh call history
    fetchCallHistory();
  };

  const handleCloseCallDialog = () => {
    setIsCallDialogOpen(false);
    setCurrentCall(null);
  };

  return (
    <div className="h-screen bg-gray-50 overflow-hidden" id="calling">
      <div className="h-full max-w-4xl mx-auto bg-white shadow-lg flex flex-col">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 sm:p-4 flex-shrink-0">
          <h1 className="text-xl sm:text-2xl md:text-2xl font-bold mb-1 sm:mb-2">
            Call History
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm">
            Manage your call records and contacts
          </p>
        </div>

        {/* Search and Filter Bar - Fixed */}
        <div className="p-3 sm:p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search calls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="all">All Calls</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
                <option value="missed">Missed</option>
              </select>
              <button className="px-3 sm:px-4 py-2 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm sm:text-base">
                <FiFilter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Call History List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0">
          {filteredCalls.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">📞</div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {searchTerm || filterType !== "all"
                  ? "No calls found"
                  : "No call history"}
              </h3>
              <p className="text-gray-400 text-sm">
                {searchTerm || filterType !== "all"
                  ? "Try adjusting your search or filter"
                  : "Start making calls to see your call history here"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCalls.map((call) => (
                <div
                  key={call.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Call Icon */}
                    <div className="flex-shrink-0">
                      {getCallIcon(call.type, call.callType)}
                    </div>

                    {/* Call Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                        {call.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                        <span
                          className={`${getCallTypeColor(
                            call.type
                          )} font-medium`}
                        >
                          {getCallTypeText(call.type)}
                        </span>
                        <span>•</span>
                        <span>
                          {call.callType === "video" ? "Video" : "Audio"}
                        </span>
                        {call.duration !== "0:00" && (
                          <>
                            <span>•</span>
                            <span>{call.duration}</span>
                          </>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs truncate">
                        {call.date} at {call.time}
                      </p>
                    </div>

                    {/* Call Back Button */}
                    <button
                      onClick={() => handleCallBack(call)}
                      className="flex-shrink-0 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Call back"
                    >
                      {call.callType === "video" ? (
                        <MdOutlineCall className="w-5 h-5" />
                      ) : (
                        <MdOutlineCall className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call Statistics - Fixed Bottom */}
        <div className="p-4 sm:p-6 bg-gray-50 border-t flex-shrink-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
            Call Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {callHistory.filter((c) => c.type === "incoming").length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Incoming</div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {callHistory.filter((c) => c.type === "outgoing").length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Outgoing</div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {callHistory.filter((c) => c.type === "missed").length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Missed</div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {callHistory.filter((c) => c.callType === "video").length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Video Calls
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily.co Call Dialog */}
      <DailyCallDialog
        isOpen={isCallDialogOpen}
        onClose={handleCloseCallDialog}
        callData={currentCall}
        isIncoming={isIncomingCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
        onEnd={handleEndCall}
      />
    </div>
  );
};

export default CallingHeader;
