import express from "express";
import mysql from "mysql2/promise";
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.get("/test-db", async (req, res) => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || "",
            port: parseInt(process.env.DB_PORT || "3306"),
            user: process.env.DB_USER || "",
            password: process.env.DB_PASSWORD || "",
            database: process.env.DB_NAME || ""
        });
        await connection.ping();
        await connection.end();
        res.send("Database connection successful");
    } catch (error) {
        console.log("Database connection error:", error);
        if (error instanceof Error) {
            res.status(500).send({ message: error.message, stack: error.stack });
        } else {
            res.status(500).send({ message: "Unknown error", error });
        }
    }
});

// Solo para desarrollo local
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Exporta el handler para Vercel
export default app;
