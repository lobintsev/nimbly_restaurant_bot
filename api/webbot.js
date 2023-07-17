import dotenv from "dotenv";
dotenv.config();

import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import generateCard from "../functions/generateCard.js";

// const BOT = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const BOT = new TelegramBot(process.env.TELEGRAM_TOKEN);
const TENANT_ID = process.env.TENANT_ID;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
// const url = `https://${process.env.VERCEL_URL}`;
const url = 'https://vatr-restaurant-bot.vercel.app'
const userStates = {};


BOT.setMyCommands([{ command: "/start", description: "Запуск" }]);

BOT.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id.toString();
	
  const user = await User.findOne({
    where: {
      chatId: chatId,
    },
  });



  if (user) {
    
    BOT.sendMessage(
      chatId,
      "Привет! Можете проверить баланс или связаться с нами",
      createMainMenuKeyboard()
    );
  
  } else {

    BOT.sendMessage(
      chatId,
      "Просим Вас пройти регистрацию.",
      createRegistrationKeyboard()
    );
  
  }
});

BOT.onText(/Программа Лояльности/, async (msg) => {
  const chatId = msg.chat.id;

  // Retrieve the user's phone from the database
  const user = await User.findOne({ where: { chatId: chatId } });

  // If the user is not found, they haven't registered yet.
  if (!user) {
    BOT.sendMessage(chatId, "Просим Вас пройти регистрацию.", register());
    return;
  }

  fetchData(chatId, user.phone);

});

BOT.onText(/Обратная связь/, (msg) => {
  const chatId = msg.chat.id;
  // Mark the user as awaiting a response
  userStates[chatId] = { awaitingHelpResponse: true };
  // Ask the user to enter their message
  BOT.sendMessage(chatId, "Напишите сообщение администратору:");
});

// When the user sends a message:
BOT.on('text', async (msg) => {
  const chatId = msg.chat.id;
  
  // If the user is marked as awaiting a response:
  if (userStates[chatId] && userStates[chatId].awaitingHelpResponse) {
    const user = await User.findOne({ where: { chatId: chatId } });
    const phone = user ? user.phone : "No phone";
    const username = msg.from.username || "No username";
    const messageToAdmin = `${msg.text}\n\n- Message from User ID: ${chatId}\n- Username: @${username}\n- Phone: ${phone}`;

    // Send the user's message to the admin
    BOT.sendMessage(ADMIN_CHAT_ID, messageToAdmin);
    // Confirm receipt of the message
    BOT.sendMessage(chatId, "Ваше сообщение отправлено администратору. Мы скоро свяжемся с Вами.", createMainMenuKeyboard());

    // Create a new message in the database
    await Message.create({ chatId, phone, message: msg.text });
    
    // Mark the user as no longer awaiting a response
    userStates[chatId].awaitingHelpResponse = false;
  }
});

BOT.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  const phone = msg.contact.phone_number;
  const first_name = msg.contact.first_name || "";
  const last_name = msg.contact.last_name || "";
  const user_id = msg.contact.user_id || "";

  BOT.sendChatAction(chatId, "typing");
  try {
    const response = await axios.post(
      "https://api.squarefi.io/api:aYQXf2CE/iiko/customers/add",
      {
        tenants_id: TENANT_ID,
        name: msg.contact.first_name,
        surname: msg.contact.last_name ?? null,
        phone: msg.contact.phone_number,
      }
    );

    if (response.status === 200) {
      BOT.sendMessage(
        chatId,
        "Вы зарегистрированы!",

        createMainMenuKeyboard()
      );

      await User.create({
        chatId,
        phone,
        first_name,
        last_name,
        user_id,
      });
      
      await fetchData(chatId, msg.contact.phone_number);
    } else {
      BOT.sendMessage(chatId, "Регистрация не удалась :(", {
        reply_markup: { remove_keyboard: true },
      });
    }
  } catch (error) {
    console.error("Error:", error);
    BOT.sendMessage(chatId, "An error occurred during registration.", {
      reply_markup: { remove_keyboard: true },
    });
  }
  delete userStates[chatId];
});

function createMainMenuKeyboard() {
  return {
    reply_markup: JSON.stringify({
      keyboard: [["Программа Лояльности"], ["Обратная связь"]],
      resize_keyboard: true,
      one_time_keyboard: false,
    }),
  };
}

function createRegistrationKeyboard() {
  console.log("createRegistrationKeyboard() called");
  return {
    reply_markup: {
      resize_keyboard: true,
      keyboard: [
        [{ text: "Передать контактные данные", request_contact: true }],
      ],
    },
  };
}

function register(msg) {
  if (!msg) {
    console.log("msg is undefined. Ignoring register function.");
    return;
  }

 
  const chatId = msg.chat.id;

  BOT.sendMessage(
    chatId,
    "Для регистрации в бонусной системе необходимо разрешить доступ к контактам",
    createRegistrationKeyboard()
  );
}

// Define a cache to store fetched data
const dataCache = new Map();

async function fetchData(chatId, phone) {
  try {
    let data;

  
      console.log(`Fetching data for phone: ${phone}`);
      const response = await axios.get(
        `https://api.squarefi.io/api:aYQXf2CE/iiko/customers/info?tenants_id=${TENANT_ID}&phone=${phone}`
      );
      data = response.data;
      dataCache.set(phone, data);

  
    console.log(`Sending message to chat: ${chatId}`);

    const formattedData = formatData(data, chatId);
    const inlineKeyboard = {
      inline_keyboard: [[{ text: "Моя карта", callback_data: "show_card" }]],
    };

    await BOT.sendMessage(chatId, formattedData, {
      parse_mode: "markdown",
      reply_markup: inlineKeyboard,
    });
  } catch (error) {
    console.error("Error fetching data:", error);

    await BOT.sendMessage(chatId, "An error occurred while fetching data.", {
      reply_markup: { remove_keyboard: true },
    });
  }
}

BOT.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  if (query.data === "show_card") {
    try {
      const user = await User.findOne({ where: { chatId: chatId } }); // Retrieve the user from the database
      if (user) {
        const phone = user.phone;
        if (!dataCache.has(phone)) {
          console.log(`Fetching data for phone: ${phone}`);
          const response = await axios.get(
            `https://api.squarefi.io/api:aYQXf2CE/iiko/customers/info?tenants_id=${TENANT_ID}&phone=${phone}`
          );
          const data = response.data;
          dataCache.set(phone, data);
        }
        console.log(`Sending card to chat: ${chatId}`);
        const data = dataCache.get(phone);
        if (data.cards && data.cards.length > 0) {
          const barcodeImage = await generateCard(
            data.cards[0].number,
            data.name,
            data.surname
          );
          if (barcodeImage) {
            BOT.sendPhoto(chatId, barcodeImage, {
              caption: "Рекомендуем закрепить вашу карту для быстрого доступа",
            });
          }
        }
      } else {
        console.log(`User not found in database for chatId: ${chatId}`);
        BOT.sendMessage(chatId, "User not found in the database.", {
          reply_markup: { remove_keyboard: true },
        });
      }
    } catch (error) {
      console.error("Error fetching the card:", error);
      BOT.sendMessage(chatId, "An error occurred while fetching the card.", {
        reply_markup: { remove_keyboard: true },
      });
    }
  }
});

function escapeMarkdown(text) {
  const specialCharacters = [
    "_",
    "*",
    "[",
    "]",
    "(",
    ")",
    "~",
    "`",
    ">",
    "#",
    "+",
    "-",
    "=",
    "|",
    "{",
    "}",
    ".",
    "!",
  ];
  const escapedText = [...text]
    .map((char) => (specialCharacters.includes(char) ? `\\${char}` : char))
    .join("");
  return escapedText;
}

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

export default async (req, res) => {
  try {
    BOT.processUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    return res.status(500).send('Server error.');
  }
};
