// Same as before
import Appointment from "../models/apoiment.model.js";
import TeleUser from "../models/user.model.js";
import Doctor from "../models/doctore.model.js";
import mongoose from "mongoose";

function generateShortId() {
  return "APPT" + Math.floor(10000 + Math.random() * 90000);
}
/**
 * Save Appointment with Phone stored IN APPOINTMENT ONLY
 */
export const saveAppointment = async (
  telegramId,
  doctorName,
  slot,
  userInfo,
  phone = null
) => {
  let teleUser = await TeleUser.findOne({ telegramId });

  if (!teleUser) {
    teleUser = await TeleUser.create({
      telegramId,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let doctor = await Doctor.findOne({ name: doctorName });
  if (!doctor) {
    doctor = await Doctor.create({ name: doctorName });
  }

  let shortId;
  let exists = true;
  while (exists) {
    shortId = "APPT" + Math.floor(10000 + Math.random() * 90000);
    exists = await Appointment.findOne({ shortId });
  }

  const newAppointment = await Appointment.create({
    teleUser: teleUser._id,
    doctor: doctor._id,
    date: today,
    time: slot,
    shortId,
    phone: phone || null,
  });

  return newAppointment;
};

/**
 * Get My Appointments
 */
export const getMyAppointments = async (telegramId) => {
  const teleUser = await TeleUser.findOne({ telegramId });
  if (!teleUser) return [];
  return Appointment.find({ teleUser: teleUser._id }).populate("doctor");
};

/**
 * Cancel Appointment by ID
 */
export const cancelAppointment = async (shortId) => {
  const appt = await Appointment.findOne({ shortId });

  if (!appt) return null;
  appt.status = "cancelled";
  await appt.save();
  return appt;
};
