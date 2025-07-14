import mongoose from "mongoose";

const teleuserSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, unique: true },
    firstName: String,
    lastName: String,
    phone: String,
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("TeleUser", teleuserSchema);
