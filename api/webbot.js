// Require our Telegram helper package
import TelegramBot from 'node-telegram-bot-api';
import sequelize from "./sqlDatabase.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

export default async (request, response) => {
  try {
      // Create our new bot handler with the token
      // that the Botfather gave us
      // Use an environment variable so we don't expose it in our code
      const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

      // Retrieve the POST request body that gets sent from Telegram
      const { body } = request;

      // Ensure that this is a message being sent
      if (body.message) {
          // Retrieve the ID for this chat and the text that the user sent
          const { chat: { id: chatId }, text } = body.message;

          // Retrieve user from the database using chatId
          const user = await User.findOne({
              where: {
                  chatId: chatId,
              },
          });

          // Stringify the user object
          const userString = JSON.stringify(user, null, 2);

          // Create a message to send back
          // We can use Markdown inside this
          const message = `✅ Thanks for your message: *"${text}"*\nUser: \`${userString}\`\nHave a great day! 👋🏻`;

          // Send our new message back in Markdown and wait for the request to finish
          await bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
      }
  } catch(error) {
      // If there was an error sending our message then we can log it into the Vercel console
      console.error('Error sending message');
      console.log(error.toString());
  }

  // Acknowledge the message with Telegram
  // by sending a 200 HTTP status code
  // The message here doesn't matter.
  response.send('OK');
};