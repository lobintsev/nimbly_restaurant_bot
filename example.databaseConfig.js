export default {
    database: process.env.DB,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,  // No protocol
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT,  // Integer not string
  };