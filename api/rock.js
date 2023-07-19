import pg from 'pg';
import TelegramBot from 'node-telegram-bot-api';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

export default async (request, response) => {
  try {
    const bot = new TelegramBot("6384562808:AAHleHsMh4WE6WgiiLdgT9RT7q0clzxH_VI");
    const { body } = request;

    if (body.message) {
      const { chat: { id }, text } = body.message;

      // Query the database
      const client = await pool.connect();
      let userInfo;
      try {
        // Use the client for executing the query
        const res = await client.query('SELECT phone, first_name, last_name FROM "Users" WHERE chatId = $1', [id]);
        userInfo = res.rows[0];
      } finally {
        // Make sure to release the client before any error handling,
        // just in case the error handling itself throws an error.
        client.release();
      }

      // Check if user information was found
      if(userInfo) {
        // Create a reply message using the queried user information
        const reply = `User Info:\nPhone: ${userInfo.phone}\nFirst Name: ${userInfo.first_name}\nLast Name: ${userInfo.last_name}`;
        await bot.sendMessage(id, reply, {parse_mode: 'Markdown'});
      } else {
        const message = `✅ Thanks for your message: *"${text}"*\nHave a great day! 👋🏻`;
        await bot.sendMessage(id, message, {parse_mode: 'Markdown'});
      }
    }
  } catch (error) {
    console.error('Error sending message');
    console.log(error.toString());
  }

  response.send('OK');
};
