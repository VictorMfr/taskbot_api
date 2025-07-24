import express from "express";
import db from "./db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import bodyParser from "body-parser";
import type { Request, Response, NextFunction } from "express";
import userRoutes from "./routes/user";
import taskRoutes from "./routes/task";
import subtaskRoutes from "./routes/subtask";
import mcpRoutes from "./routes/mcp";

const app = express();
app.use(bodyParser.json());

// Middleware para loggear todas las peticiones
app.use((req, res, next) => {
    console.log(`🌐 [SERVER] ${req.method} ${req.url}`);
    next();
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Pool de conexión importado desde db.ts

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.use("/api", userRoutes(db, JWT_SECRET));
app.use("/api", subtaskRoutes(db, JWT_SECRET)); // Rutas de subtareas primero (más específicas)
app.use("/api", taskRoutes(db, JWT_SECRET)); // Rutas de tareas después (más generales)
app.use("/api/mcp", mcpRoutes); // Nuevo endpoint MCP HTTP

// Log para debuggear las rutas registradas
console.log('🔧 [SERVER] Rutas registradas:');
console.log('  - User routes: /register, /login, /auth');
console.log('  - Subtask routes: /task/:taskId/subtask, /subtask/* (primero)');
console.log('  - Task routes: /task/* (después)');
console.log('  - MCP routes: /mcp/* (nuevo)');

if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Exporta el handler para Vercel
export default app;
