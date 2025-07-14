import express from "express";
import TelegramBot from "node-telegram-bot-api";
import "./DB/DbConnect.js";
import {
  cancelAppointment,
  getMyAppointments,
  saveAppointment,
} from "./controllers/appointmentController.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

const Bot = new TelegramBot(process.env.TELE_TOKEN, { polling: true });

const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "📅 Book Appointment", callback_data: "book_appointment" }],
      [{ text: "❌ Cancel Appointment", callback_data: "cancel_appointment" }],
      [{ text: "📜 My Appointments", callback_data: "my_appointments" }],
      [{ text: "📞 Contact Clinic", callback_data: "contact_clinic" }],
    ],
  },
};
const userStates = {};

Bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  Bot.sendMessage(chatId, "👋 Welcome! Please choose an option:", mainMenu);
});

Bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  switch (data) {
    case "book_appointment":
      Bot.editMessageText("Please choose a doctor:", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: "Dr. Sharma", callback_data: "doctor_sharma" }],
            [{ text: "Dr. Patel", callback_data: "doctor_patel" }],
            [{ text: "⬅️ Back", callback_data: "back_home" }],
          ],
        },
      });
      break;

    case "cancel_appointment":
      Bot.editMessageText("Please send your Appointment ID to cancel:", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [[{ text: "⬅️ Back", callback_data: "back_home" }]],
        },
      });
      userStates[chatId] = { expect: "cancel", promptMessageId: messageId };
      break;

    case "my_appointments":
      try {
        const telegramId = query.from.id.toString();
        const appointments = await getMyAppointments(telegramId);

        if (!appointments.length) {
          await Bot.editMessageText("📜 No appointments found.", {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: "⬅️ Back", callback_data: "back_home" }],
              ],
            },
          });
          break;
        }

        let text = "📜 *Your Appointments:*\n\n";
        appointments.forEach((appt, index) => {
          text += `#${index + 1}\n`;
          text += `👨‍⚕️ Doctor: Dr. ${appt.doctor?.name || "N/A"}\n`;
          text += `🕒 Time: ${appt.time}\n`;
          text += `📅 Date: ${appt.date.toDateString()}\n`;
          text += `📞 Phone: ${appt.phone || "Not Provided"}\n`;
          text += `📌 Status: ${appt.status}\n`;
          text += `Your Appointment ID: *${appt.shortId}*\n\n`;
        });

        await Bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "⬅️ Back", callback_data: "back_home" }],
            ],
          },
        });
      } catch (err) {
        console.log(err);
        Bot.sendMessage(chatId, "❌ Error fetching appointments.");
      }
      break;

    case "contact_clinic":
      Bot.editMessageText("📞 You can contact us at: +91-8238443846", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [[{ text: "⬅️ Back", callback_data: "back_home" }]],
        },
      });
      break;

    case "back_home":
      Bot.editMessageText("👋 Welcome back! Please choose an option:", {
        chat_id: chatId,
        message_id: messageId,
        ...mainMenu,
      });
      break;
    case "skip_phone":
      const s = userStates[chatId];
      if (!s || s.expect !== "phone") break;
      const appt = await saveAppointment(
        chatId.toString(),
        s.doctor,
        s.slot,
        s.userInfo,
        null
      );

      await Bot.editMessageText(
        `✅ Appointment booked!\nDoctor: Dr. ${s.doctor}\nTime: ${s.slot}\nID: ${appt.shortId}\nPhone: Not Provided`,
        {
          chat_id: chatId,
          message_id: messageId,
        }
      );

      await Bot.sendMessage(
        chatId,
        "👋 Welcome back! Please choose an option:",
        mainMenu
      );

      userStates[chatId] = null;
      break;

    default:
      if (data.startsWith("doctor_")) {
        const doctorName = data.split("_")[1];
        Bot.editMessageText(
          `✅ You selected Dr. ${doctorName}. Please choose a slot:`,
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "10:00 AM",
                    callback_data: `slot_${doctorName}_10AM`,
                  },
                ],
                [
                  {
                    text: "12:00 PM",
                    callback_data: `slot_${doctorName}_12PM`,
                  },
                ],
                [{ text: "3:00 PM", callback_data: `slot_${doctorName}_3PM` }],
                [{ text: "⬅️ Back", callback_data: "book_appointment" }],
              ],
            },
          }
        );
      } else if (data.startsWith("slot_")) {
        const [_, doctor, slot] = data.split("_");
        userStates[chatId] = {
          expect: "phone",
          doctor,
          slot,
          userInfo: query.from,
          promptMessageId: messageId,
        };

        Bot.editMessageText(
          `📞 Please enter your phone number to confirm your booking or press SKIP:`,
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: "⏭️ Skip", callback_data: "skip_phone" }],
              ],
            },
          }
        );
      }

      break;
  }
});

Bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const state = userStates[chatId];
  if (!state) return;

  if (state.expect === "phone") {
    const phone = msg.text.trim();
    try {
      const appointment = await saveAppointment(
        chatId.toString(),
        state.doctor,
        state.slot,
        state.userInfo,
        phone
      );

      Bot.editMessageText(
        `✅ Appointment booked!\nDoctor: Dr. ${state.doctor}\nTime: ${state.slot}\nAppointment ID: ${appointment.shortId}\nPhone: ${phone}`,
        { chat_id: chatId, message_id: state.promptMessageId }
      );
      Bot.sendMessage(
        chatId,
        "👋 Welcome back! Please choose an option:",
        mainMenu
      );
    } catch (err) {
      Bot.sendMessage(chatId, "❌ Something went wrong. Try again.");
      console.log(err);
    }
    userStates[chatId] = null;
  } else if (state.expect === "cancel") {
    const id = msg.text.trim().toString();
    if (!id.startsWith("APPT") || id.length !== 9) {
      Bot.sendMessage(chatId, `❌ Invalid ID format! Example: APPT12345`);
      return;
    }
    try {
      const state = userStates[chatId];
      const cancelled = await cancelAppointment(id);
      if (cancelled) {
        Bot.editMessageText(`✅ Appointment cancelled! ID: ${id}`, {
          chat_id: chatId,
          message_id: state.promptMessageId,
        });
        userStates[chatId] = null;
        Bot.sendMessage(
          chatId,
          "👋 Welcome back! Please choose an option:",
          mainMenu
        );
      } else {
        Bot.editMessageText(
          `❌ Invalid Appointment ID. Please try again or go back:`,
          {
            chat_id: chatId,
            message_id: state.promptMessageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: "⬅️ Back", callback_data: "back_home" }],
              ],
            },
          }
        );
      }
    } catch (err) {
      console.error(err);
      Bot.sendMessage(chatId, `❌ Something went wrong!`);
      userStates[chatId] = null;
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
