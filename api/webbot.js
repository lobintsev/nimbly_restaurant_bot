import TelegramBot from "node-telegram-bot-api";
import sequelize from "./sqlDatabase.js";
import User from "../models/User.js";

export default async (request, response) => {
  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
  const { body } = request;

  if (body.message) {
    const { chat: { id: chatId }, text } = body.message;

    if (text === "/start") {
      const user = await User.findOne({
        where: {
          chatId: chatId,
        },
      });

      if (user) {
        await bot.sendMessage(chatId, "Привет! Можете проверить баланс или связаться с нами", createMainMenuKeyboard());
      } else {
        await bot.sendMessage(chatId, "Просим Вас пройти регистрацию.", createRegistrationKeyboard());
      }
    }  
    
    if (text === "/start") {
      const userString = JSON.stringify(user, null, 2);

      const message = `✅ Thanks for your message: *"${text}"*\nUser: \`${userString}\`\nHave a great day! 👋🏻`;
      const keyboardOptions = createMainMenuKeyboard();

      await bot.sendMessage(chatId, message, { ...keyboardOptions, parse_mode: "Markdown" });
    }
  }

  response.send("OK");
};

function createMainMenuKeyboard() {
  return {
    reply_markup: JSON.stringify({
      keyboard: [["Лояльность"], ["Фидбек"]],
      resize_keyboard: true,
      one_time_keyboard: false,
    }),
  };
}

function createRegistrationKeyboard() {
  // Modify this function to return your registration keyboard
}

