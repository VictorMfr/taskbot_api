import express from "express";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import bodyParser from "body-parser";
import type { Request, Response, NextFunction } from "express";
import userRoutes from "./routes/user";
import taskRoutes from "./routes/task";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Configuración de conexión MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "taskbot",
});

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.use(userRoutes(db, JWT_SECRET));
app.use(taskRoutes(db, JWT_SECRET));



if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Exporta el handler para Vercel
export default app;
