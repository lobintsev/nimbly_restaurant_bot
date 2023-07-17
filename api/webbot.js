import TelegramBot from "node-telegram-bot-api";
import User from "../models/User.js";
import axios from "axios";

const fetchData = async (chatId, phone, bot) => {
  try {
    const response = await axios.get(
      `https://api.squarefi.io/api:aYQXf2CE/iiko/customers/info?tenants_id=${TENANT_ID}&phone=${phone}`
    );
    const data = response.data;

    const formattedData = formatData(data);
    const inlineKeyboard = {
      reply_markup: JSON.stringify({
        inline_keyboard: [[{ text: "Моя карта", callback_data: "show_card" }]],
      }),
    };

    await bot.sendMessage(chatId, formattedData, inlineKeyboard);
  } catch (error) {
    console.error("Error fetching data:", error);
    await bot.sendMessage(chatId, "An error occurred while fetching data.");
  }
};

const formatData = (data) => {
  // Format the data as needed
  // This is a placeholder - you should replace it with your own code
  return JSON.stringify(data, null, 2);
};


export default async (request, response) => {
  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
  const { body } = request;

  if (body.message) {
    const { chat: { id: chatId }, text } = body.message;
    let user = null; // Declare the user variable here

    if (text === "/start") {
      user = await User.findOne({
        where: {
          chatId: chatId,
        },
      });

      if (user) {
        await bot.sendMessage(chatId, "Привет! Можете проверить баланс или связаться с нами", createMainMenuKeyboard());
      } else {
        await bot.sendMessage(chatId, "Просим Вас пройти регистрацию.", createRegistrationKeyboard());
      }
    } else if (text === "Лояльность") {
     
        await fetchData(chatId, user.phone, bot);
    
    } else {
      if (!user) {
        user = await User.findOne({
          where: {
            chatId: chatId,
          },
        });
      }

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