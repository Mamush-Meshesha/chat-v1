import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["incoming", "outgoing", "missed"],
      required: true,
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    status: {
      type: String,
      enum: ["completed", "missed", "rejected"],
      default: "completed",
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    // Jitsi-specific fields
    roomName: {
      type: String,
      required: true,
      unique: true,
    },
    platform: {
      type: String,
      enum: ["jitsi", "webrtc"],
      default: "jitsi",
    },
    // Additional metadata for Jitsi
    meetingId: {
      type: String,
      sparse: true,
    },
    participantCount: {
      type: Number,
      default: 0,
    },
    recordingUrl: {
      type: String,
    },
    livestreamUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for better query performance
callSchema.index({ caller: 1, receiver: 1, startTime: -1 });
callSchema.index({ roomName: 1 }); // Index for room name lookups
callSchema.index({ platform: 1 }); // Index for platform filtering

const Call = mongoose.model("Call", callSchema);

export default Call;
