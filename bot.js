import dotenv from "dotenv";
dotenv.config();
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import bwipjs from "bwip-js";
import sharp from "sharp";
import db, { writeData, readData } from "./db.js";

const BOT = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const TENANT_ID = process.env.TENANT_ID;
const CARD_LOGO = process.env.CARD_LOGO;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

let awaitingHelpResponse = new Map(); // A map to hold users that are expected to send a help message
const userStates = {};

BOT.setMyCommands([{ command: "/start", description: "Запуск" }]);

BOT.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id.toString();
  const data = await readData();

  console.log("Data read from the database:", data);

  const user = data.users.find((u) => {
    console.log(
      `Comparing database chatId (${u.chatId}) with message chatId (${chatId})`
    );
    return u.chatId.toString() === chatId;
  });

  console.log("Value of user:", user);

  if (user) {
    console.log('Sending "Hi" message...');
    BOT.sendMessage(
      chatId,
      "Привет! Можете проверить баланс или связаться с нами",
      createMainMenuKeyboard()
    );
    console.log("Message sent.");
  } else {
    console.log('Sending "Not Found" message...');
    BOT.sendMessage(
      chatId,
      "Просим Вас пройти регистрацию.",
      createRegistrationKeyboard()
    );
    console.log("Message sent.");
  }
});

BOT.onText(/Программа Лояльности/, (msg) => {
  const chatId = msg.chat.id;

  // Retrieve the user's phone from the database
  const user = db.data.users.find((u) => u.chatId === chatId);

  // If the user is not found, they haven't registered yet.
  if (!user) {
    BOT.sendMessage(chatId, "Просим Вас пройти регистрацию.", register());
    return;
  }

  fetchData(chatId, user.phone);
});

BOT.onText(/Обратная связь/, (msg) => {
  help(msg);
});

BOT.on("text", async (msg) => {
  // Make the function asynchronous
  const chatId = msg.chat.id;
  if (awaitingHelpResponse.has(chatId)) {
    // If we're expecting a help response from this user...
    const username = msg.from.username || "No username"; // Get the username or set a default
    const phone = msg.contact ? msg.contact.phone_number : "No phone"; // Get the phone or set a default
    const messageToAdmin = `${msg.text}\n\n- Message from User ID: ${chatId}\n- Username: @${username}\n- Phone: ${phone}`; // Format message to admin
    BOT.sendMessage(ADMIN_CHAT_ID, messageToAdmin); // Send the help message to the admin
    BOT.sendMessage(
      chatId,
      "Ваше сообщение отправлено администору. Мы скоро свяжемся с Вами",
      createMainMenuKeyboard()
    );

    // Database operation
    const data = await readData(); // Read the data from the file
    data.messages.push({ chatId, phone, messageToAdmin }); // Add the new message
    await writeData(data); // Write the updated data back to the file

    awaitingHelpResponse.delete(chatId); // Remove this user from the help response awaiting list
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
      // Save the user to the database
      db.data.users.push({ chatId, phone, first_name, last_name, user_id });

      // Write the changes to the JSON file
      await db.write();
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

function help(msg) {
  const chatId = msg.chat.id;
  BOT.sendMessage(chatId, "Напишите сообщение администратору:");
  awaitingHelpResponse.set(chatId, true); // Indicate that we're awaiting a help response from this user
}

function register(msg) {
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

    if (!dataCache.has(phone)) {
      console.log(`Fetching data for phone: ${phone}`);
      const response = await axios.get(
        `https://api.squarefi.io/api:aYQXf2CE/iiko/customers/info?tenants_id=${TENANT_ID}&phone=${phone}`
      );
      data = response.data;
      dataCache.set(phone, data);
    } else {
      data = dataCache.get(phone);
    }

    console.log(dataCache);
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
      const user = db.data.users.find((u) => u.chatId === chatId);
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
          const barcodeImage = await generateBarcode(
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

function formatData(data) {
  let message = `*Ваши данные* \n\n`;

  if (data.name && data.surname)
    message += `Имя: ${data.name} ${data.surname} \n`;
  if (data.phone) message += `Телефон: ${data.phone} \n`;
  if (data.email) message += `E-mail: ${data.email} \n\n`;

  message += "*Бонусы*: \n";
  data.walletBalances?.forEach((balanceObj) => {
    if (balanceObj.name && balanceObj.balance)
      message += `${balanceObj.name}: ${balanceObj.balance.toFixed(2)} \n`;
  });

  return message;
}

async function generateBarcode(number, name, surname) {
  if (!number) return null;

  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: number,
        scale: 4,
        height: 20,
        includetext: true,
        textxalign: "center",
      },
      async (err, pngBuffer) => {
        if (err) {
          reject(err);
        } else {
          try {
            // Fetch the logo image from a URL
            const response = await axios.get(CARD_LOGO, {
              responseType: "arraybuffer",
            });
            const logoBuffer = Buffer.from(response.data, "binary");
            // Resize the images
            const logoHeight = 200;
            const resizedLogoBuffer = await sharp(logoBuffer)
              .resize({ height: logoHeight })
              .toBuffer();
            const barcodeHeight = 300;
            const resizedBarcodeBuffer = await sharp(pngBuffer)
              .resize({ height: barcodeHeight })
              .toBuffer();

            // Get the width of the resized images
            const [logoMetadata, barcodeMetadata] = await Promise.all([
              sharp(resizedLogoBuffer).metadata(),
              sharp(resizedBarcodeBuffer).metadata(),
            ]);

            const logoWidth = logoMetadata.width;
            const barcodeWidth = barcodeMetadata.width;
            // Create SVG text
            const text = `${name} ${surname}`;
            const svgText = `
              <svg width="700" height="${barcodeHeight}">
                <style>
                  .text { fill: #000; font-size: 50px; font-weight: bold;}
                </style>
                <text x="50%" y="50%" text-anchor="middle" class="text">${text}</text>
              </svg>
            `;
            const svgTextBuffer = Buffer.from(svgText);

            // Create a new blank image
            const baseWidth = 1280;
            const baseHeight = 720;
            const image = await sharp({
              create: {
                width: baseWidth,
                height: baseHeight,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
              },
            });

            // Composite the images and the SVG text
            const outputBuffer = await image
              .composite([
                {
                  input: resizedLogoBuffer,
                  top: 70,
                  left: 70,
                },
                {
                  input: svgTextBuffer,
                  top: 70,
                  left: Math.round(baseWidth - 700),
                },
                {
                  input: resizedBarcodeBuffer,
                  top: 380,
                  left: Math.round((baseWidth - barcodeWidth) / 2),
                },
              ])
              .png()
              .toBuffer();

            resolve(outputBuffer);
          } catch (error) {
            reject(error);
          }
        }
      }
    );
  });
}

export default BOT;
