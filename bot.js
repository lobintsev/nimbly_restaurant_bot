require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const bwipjs = require("bwip-js");

// Replace 'YOUR_BOT_TOKEN' with the token provided by BotFather
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: true,
});

const commands = [
  {
    command: "start",
    description: "Запуск",
  },

  {
    command: "help",
    description: "Раздел помощи",
  },
  {
    command: "register",
    description: "Регистрация",
  },
];

bot.setMyCommands(commands);

// Constant for tenant_id
const TENANT_ID = process.env.TENANT_ID;

// Command handlers
bot.onText(/\/start/, start);
bot.onText(/\/help/, help);

function start(msg) {
  const chatId = msg.chat.id;

  register(msg); // Add this line to call the menu function
}

function help(msg) {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Help for this bot", { parse_mode: "markdown" });
}

// Fetch command handler

// Format the fetched data
function formatData(data) {
  if (!data) return "Нет данных";

  let message = `*Ваши данные* \n\n`;

  // Check if the necessary data is available before using it
  if (data.name && data.surname) {
    message += `Имя: ${data.name} ${data.surname} \n`;
  }
  if (data.phone) {
    message += `Телефон: ${data.phone} \n`;
  }
  if (data.email) {
    message += `E-mail: ${data.email} \n\n`;
  }

  message += "*Бонусы*: \n";
  if (data.walletBalances) {
    data.walletBalances.forEach((balanceObj) => {
      if (balanceObj.name && balanceObj.balance) {
        message += `${balanceObj.name}: ${balanceObj.balance.toFixed(2)} \n`;
      }
    });
  }
  message += "\n";

  message += "*Программы*: \n";
  if (data.categories) {
    data.categories.forEach((category) => {
      if (category.name && category.isActive !== undefined) {
        const status = category.isActive ? "🗸" : "🗴";
        message += `${category.name}: ${status} \n`;
      }
    });
  }
  message += "\n";

  message += "*Карты*: \n";
  if (data.cards) {
    data.cards.forEach((card) => {
      if (card.number) {
        message += `Карта: ${card.number} \n`;
      }
    });
  }

  return message;
}

// Generate barcode image using bwip-js
function generateBarcode(number) {
  if (number) {
    return new Promise((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: "code128", // Barcode type
          text: number, // Text to encode
          scale: 4, // 3x scaling factor
          height: 20, // Bar height, in millimeters
          includetext: true, // Show human-readable text
          textxalign: "center", // Always good to set this
        },
        (err, png) => {
          if (err) {
            reject(err);
          } else {
            resolve(png);
          }
        }
      );
    });
  }
  return null;
}

let userStates = {};

function register(msg) {
  const chatId = msg.chat.id;
  userStates[chatId] = {
    state: "PHONE_REGISTRATION",
    registerInitiated: true,
  };
  bot.sendMessage(chatId, 'Для регистрации в прогроамме лояльности нажмите кнопку "Разрешить доступ к контактам" ниже. Мы не передаем Ваши данные третьим лицам и будем использовать их только в рамках нашей сети:', {
    reply_markup: {
      one_time_keyboard: false,
      resize_keyboard: true,
      keyboard: [[{ text: "Разрешить доступ к контактам", request_contact: true }]],
    },
  });
}

bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;

  if (userStates[chatId] && userStates[chatId].state === "PHONE_REGISTRATION") {
    // Handle the registration contact event
    bot.sendChatAction(chatId, "typing");
    try {
      const response = await axios.post(
        "https://api.squarefi.io/api:aYQXf2CE/iiko/customers/add",
        {
          tenants_id: TENANT_ID,
          name: msg.contact.first_name, // Here I use msg.contact.first_name instead
          surname: msg.contact.last_name ?? null, // Check if last_name is available, if not assign null
          phone: msg.contact.phone_number,
        }
      );

      if (response.status === 200) {
        bot.sendMessage(chatId, "Вы зарегистрированы!");
        await fetchData(chatId, msg.contact.phone_number);
      } else {
        bot.sendMessage(chatId, "Registration failed.", {
          reply_markup: {
            remove_keyboard: true,
          },
        });
      }
    } catch (error) {
      console.error("Error:", error);
      bot.sendMessage(chatId, "An error occurred during registration.", {
        reply_markup: {
          remove_keyboard: true,
        },
      });
    }

    delete userStates[chatId];
  } else {
    await fetchData(chatId, msg.contact.phone_number);
  }
});

// Fetch data function
async function fetchData(chatId, phone) {
  try {
    const url = "https://api.squarefi.io/api:aYQXf2CE/iiko/customers/info";
    const query = `tenants_id=${TENANT_ID}&phone=${phone}`;

    const response = await axios.get(`${url}?${query}`);

    const data = response.data;
    const formattedData = formatData(data);

    // Send user's data
    bot.sendMessage(chatId, formattedData, { parse_mode: "markdown" });

    // Generate and send barcode if it exists
    if (data.cards && data.cards.length > 0) {
      const barcodeImage = await generateBarcode(data.cards[0].number);
      if (barcodeImage) {
        bot.sendPhoto(chatId, barcodeImage, {
          reply_markup: {
            remove_keyboard: true,
          },
        });
      }
    }
  } catch (error) {
    // Handle errors
    console.error("Error:", error);
    bot.sendMessage(chatId, "An error occurred while fetching data.", {
      reply_markup: {
        remove_keyboard: true,
      },
    });
  }
}
// Export the bot instance if needed
module.exports = bot;
