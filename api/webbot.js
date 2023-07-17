// Require our Telegram helper package
import TelegramBot from "node-telegram-bot-api";
import sequelize from "./sqlDatabase.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

export default async (request, response) => {
  try {
    const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

    const { body } = request;

    if (body.message) {
      const {
        chat: { id: chatId },
        text,
      } = body.message;

      const user = await User.findOne({
        where: {
          chatId: chatId,
        },
      });

      const userString = JSON.stringify(user, null, 2);

      const message = `✅ Thanks for your message: *"${text}"*\nUser: \`${userString}\`\nHave a great day! 👋🏻`;

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      createMainMenuKeyboard();
    
    }

    function createMainMenuKeyboard() {
      return {
        reply_markup: JSON.stringify({
          keyboard: [["Программа Лояльности"], ["Обратная связь"]],
          resize_keyboard: true,
          one_time_keyboard: false,
        }),
      };
    }
    
  } catch (error) {
    console.error("Error sending message");
    console.log(error.toString());
  }

  response.send("OK");
};
