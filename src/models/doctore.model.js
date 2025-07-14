import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: String,
  availableSlots: [
    {
      date: Date,
      time: String,
      isBooked: { type: Boolean, default: false },
    },
  ],
});

export default mongoose.model("Doctor", doctorSchema);
