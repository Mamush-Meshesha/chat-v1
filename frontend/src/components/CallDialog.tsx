import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { acceptCallStart, declineCall, endCall } from "../slice/callingSlice";

const CallDialog: React.FC = () => {
  const dispatch = useDispatch();
  const {
    outgoingCallData,
    incomingCallData,
    isCallDialogOpen,
    isIncomingCall,
    roomName,
  } = useSelector((state: RootState) => state.calling);

  // Handle incoming call (receiver side)
  const handleAcceptCall = () => {
    if (incomingCallData) {
      dispatch(acceptCallStart());
    }
  };

  const handleDeclineCall = () => {
    dispatch(declineCall());
  };

  const handleEndCall = () => {
    dispatch(endCall());
  };

  // Don't render if no call dialog is open
  if (!isCallDialogOpen && !isIncomingCall) {
    return null;
  }

  // Incoming call dialog
  if (isIncomingCall && incomingCallData) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-semibold mb-2">
              Incoming{" "}
              {incomingCallData.callType === "audio" ? "Audio" : "Video"} Call
            </h3>

            <p className="text-gray-600 mb-4">
              {incomingCallData.callerName} is calling...
            </p>

            <div className="flex space-x-3">
              <button
                onClick={handleAcceptCall}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg"
              >
                Accept
              </button>
              <button
                onClick={handleDeclineCall}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Outgoing call dialog
  if (isCallDialogOpen && outgoingCallData) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-semibold mb-2">Calling...</h3>

            <p className="text-gray-600 mb-4">
              Waiting for {outgoingCallData.receiverId} to answer...
            </p>

            <div className="text-sm text-gray-500 mb-4">Room: {roomName}</div>

            <button
              onClick={handleEndCall}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
            >
              End Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CallDialog;
