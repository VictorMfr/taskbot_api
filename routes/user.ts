import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Recibe la pool de MySQL y el JWT_SECRET como parámetros para inyectar dependencias
export default function userRoutes(db: any, JWT_SECRET: string) {
    const router = Router();

    // Middleware para verificar JWT
    function authenticateToken(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Token requerido" });
            return;
        }
        jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
            if (err) {
                res.status(403).json({ message: "Token inválido" });
                return;
            }
            (req as any).user = user;
            next();
        });
    }

    // Registro
    router.post("/register", async (req: Request, res: Response) => {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            res.status(400).json({ message: "Todos los campos son requeridos" });
            return;
        }
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(
                "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                [username, email, hashedPassword]
            );
            res.status(201).json({ message: "Usuario registrado" });
        } catch (err) {
            console.log("Error en registro:", err);
            res.status(500).json({ message: "Error al registrar usuario" });
        }
    });

    // Login
    router.post("/login", async (req: Request, res: Response) => {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: "Email y contraseña requeridos" });
            return;
        }
        try {
            const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]) as [any[], any];
            const user = rows[0];
            if (!user) {
                res.status(404).json({ message: "Usuario no encontrado" });
                return;
            }
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                res.status(401).json({ message: "Contraseña incorrecta" });
                return;
            }
            const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "1d" });
            res.json({ token });
        } catch (err) {
            console.log("Error en login:", err);
            res.status(500).json({ message: "Error al iniciar sesión" });
        }
    });

    // Obtener todos los usuarios (protegido)
    router.get("/", authenticateToken, async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query("SELECT id, username, email, user_type, is_active, created_at, updated_at FROM users") as [any[], any];
            res.json(rows);
        } catch (err) {
            console.log("Error al obtener usuarios:", err);
            res.status(500).json({ message: "Error al obtener usuarios" });
        }
    });

    // Obtener usuario por ID (protegido)
    router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query("SELECT id, username, email, user_type, is_active, created_at, updated_at FROM users WHERE id = ?", [req.params.id]) as [any[], any];
            if (rows.length === 0) {
                res.status(404).json({ message: "Usuario no encontrado" });
                return;
            }
            res.json(rows[0]);
        } catch (err) {
            console.log("Error al obtener usuario:", err);
            res.status(500).json({ message: "Error al obtener usuario" });
        }
    });

    // Actualizar usuario (protegido)
    router.put("/:id", authenticateToken, async (req: Request, res: Response) => {
        const { username, email, password, user_type, is_active } = req.body;
        try {
            let updateFields = [];
            let values = [];
            if (username) { updateFields.push("username = ?"); values.push(username); }
            if (email) { updateFields.push("email = ?"); values.push(email); }
            if (password) { updateFields.push("password = ?"); values.push(await bcrypt.hash(password, 10)); }
            if (user_type) { updateFields.push("user_type = ?"); values.push(user_type); }
            if (typeof is_active === "boolean") { updateFields.push("is_active = ?"); values.push(is_active); }
            if (updateFields.length === 0) {
                res.status(400).json({ message: "Nada para actualizar" });
                return;
            }
            values.push(req.params.id);
            await db.query(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, values);
            res.json({ message: "Usuario actualizado" });
        } catch (err) {
            console.log("Error al actualizar usuario:", err);
            res.status(500).json({ message: "Error al actualizar usuario" });
        }
    });

    // Eliminar usuario (protegido)
    router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
        try {
            await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
            res.json({ message: "Usuario eliminado" });
        } catch (err) {
            console.log("Error al eliminar usuario:", err);
            res.status(500).json({ message: "Error al eliminar usuario" });
        }
    });

    return router;
} 