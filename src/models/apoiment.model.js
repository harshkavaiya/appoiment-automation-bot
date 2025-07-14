import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  teleUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TeleUser",
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: false,
  },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: {
    type: String,
    enum: ["booked", "cancelled", "completed"],
    default: "booked",
  },
  shortId: { type: String, unique: true },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Appointment", appointmentSchema);
