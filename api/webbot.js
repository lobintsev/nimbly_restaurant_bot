import TelegramBot from "node-telegram-bot-api";
import User from "../models/User.js";
import axios from "axios";
const TENANT_ID = process.env.TENANT_ID;

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

function formatData(data) {
  let message = "*Ваши данные* \n\n";

  if (data.name && data.surname)
    message += `Имя: ${escapeMarkdown(data.name)} ${escapeMarkdown(
      data.surname
    )} \n`;
  if (data.phone)
    message += `Телефон: ${escapeMarkdown(data.phone).replace("\\+", "+")} \n`;
  if (data.email)
    message += `E-mail: ${escapeMarkdown(data.email).replace("\\.", ".")} \n\n`;

  message += "*Бонусы*: \n";
  data.walletBalances?.forEach((balanceObj) => {
    if (balanceObj.name && balanceObj.balance)
      message += `${escapeMarkdown(
        balanceObj.name
      )}: ${balanceObj.balance.toFixed(2)} \n`;
  });

  return message;
}

export default async (request, response) => {
  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
  const { body } = request;

  if (body.message) {
    const { chat: { id: chatId }, text } = body.message;

    const user = await User.findOne({
      where: {
        chatId: chatId,
      },
    });

    if (text === "/start") {
      if (user) {
        await bot.sendMessage(chatId, "Привет! Можете проверить баланс или связаться с нами", createMainMenuKeyboard());
      } else {
        await bot.sendMessage(chatId, "Просим Вас пройти регистрацию.", createRegistrationKeyboard());
      }
    } else if (text === "Лояльность") {
      if (user) {
        await fetchData(chatId, user.phone, bot);
      } else {
        await bot.sendMessage(chatId, "Просим Вас пройти регистрацию.", createRegistrationKeyboard());
      }
    } else {
      if (user) {
        const userString = JSON.stringify(user, null, 2);
        const message = `✅ Thanks for your message: *"${text}"*\nUser: \`${userString}\`\nHave a great day! 👋🏻`;
        const keyboardOptions = createMainMenuKeyboard();

        await bot.sendMessage(chatId, message, { ...keyboardOptions, parse_mode: "Markdown" });
      } else {
        await bot.sendMessage(chatId, "Просим Вас пройти регистрацию.", createRegistrationKeyboard());
      }
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

function escapeMarkdown(text) {
  // Add this function to escape Markdown syntax
  return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&');
}
