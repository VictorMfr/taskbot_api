import express from "express";
import sequelize from "sequelize/types/sequelize";
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Hello World");
});

// Test database connection route
app.get("/test-db", async (req, res) => {

    const db = new sequelize(
        process.env.DB_NAME || "",
        process.env.DB_USER || "",
        process.env.DB_PASSWORD || "",
        {
            host: process.env.DB_HOST || "",
            dialect: "mysql"
        }
    );

    try {
        await db.authenticate();
        res.send("Database connection successful");
    } catch (error) {
        res.status(500).send("Database connection failed");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
