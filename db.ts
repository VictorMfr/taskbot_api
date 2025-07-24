import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "taskbot_db",
  connectionLimit: 1,
  waitForConnections: true,
  queueLimit: 0
});

export default db;
