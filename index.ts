import express from "express";
import { Sequelize } from "sequelize";
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.get("/test-db", async (req, res) => {
    try {
        const db = new Sequelize({
            host: process.env.DB_HOST as string || "",
            port: parseInt(process.env.DB_PORT as string) || 3306,
            username: process.env.DB_USER as string || "",
            password: process.env.DB_PASSWORD as string || "",
            database: process.env.DB_NAME as string || "",
            dialect: "mysql"
        });

        await db.authenticate();
        res.send("Database connection successful");
    } catch (error) {
        res.status(500).send("Database connection failed");
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
