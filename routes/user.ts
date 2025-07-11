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
            res.status(400).json({ success: false, message: "Todos los campos son requeridos", data: null });
            return;
        }
        try {
            // Verificar si el correo ya existe
            const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]) as [any[], any];
            if (existing.length > 0) {
                res.status(409).json({ success: false, message: "El usuario ya existe", data: null });
                return;
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const [result] = await db.query(
                "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                [username, email, hashedPassword]
            );
            // Obtener el usuario recién creado
            const [rows] = await db.query("SELECT id, username, email, user_type FROM users WHERE id = ?", [result.insertId]) as [any[], any];
            const user = rows[0];
            // Generar token
            const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "1d" });
            res.status(201).json({
                success: true,
                message: "Usuario registrado",
                data: { token, user }
            });
        } catch (err) {
            console.log("Error en registro:", err);
            res.status(500).json({ success: false, message: "Error al registrar usuario", data: null });
        }
    });

    // Login
    router.post("/login", async (req: Request, res: Response) => {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: "Email y contraseña requeridos", data: null });
            return;
        }
        try {
            const [rows] = await db.query("SELECT id, username, email, password, user_type FROM users WHERE email = ?", [email]) as [any[], any];
            const user = rows[0];
            if (!user) {
                res.status(401).json({ success: false, message: "El correo o contraseña son incorrectos", data: null });
                return;
            }
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                res.status(401).json({ success: false, message: "El correo o contraseña son incorrectos", data: null });
                return;
            }
            const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "1d" });
            // No enviar password al cliente
            delete user.password;
            res.json({
                success: true,
                message: "Login exitoso",
                data: { token, user }
            });
        } catch (err) {
            console.log("Error en login:", err);
            res.status(500).json({ success: false, message: "Error al iniciar sesión", data: null });
        }
    });

    // Verificar token y obtener perfil del usuario (protegido)
    router.get("/auth", authenticateToken, async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query("SELECT id, username, email, user_type FROM users WHERE id = ?", [req.user.id]) as [any[], any];
            if (rows.length === 0) {
                res.status(404).json({ success: false, message: "Usuario no encontrado", data: null });
                return;
            }
            res.json({ success: true, message: "Token válido", data: { user: rows[0] } });
        } catch (err) {
            console.log("Error al verificar token:", err);
            res.status(500).json({ success: false, message: "Error al verificar token", data: null });
        }
    });

    // Obtener todos los usuarios (protegido)
    router.get("/user", authenticateToken, async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query("SELECT id, username, email, user_type, is_active, created_at, updated_at FROM users") as [any[], any];
            res.json({ success: true, message: "Usuarios obtenidos", data: rows });
        } catch (err) {
            console.log("Error al obtener usuarios:", err);
            res.status(500).json({ success: false, message: "Error al obtener usuarios", data: null });
        }
    });

    // Obtener usuario por ID (protegido)
    router.get("user/:id", authenticateToken, async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query("SELECT id, username, email, user_type, is_active, created_at, updated_at FROM users WHERE id = ?", [req.params.id]) as [any[], any];
            if (rows.length === 0) {
                res.status(404).json({ success: false, message: "Usuario no encontrado", data: null });
                return;
            }
            res.json({ success: true, message: "Usuario obtenido", data: rows[0] });
        } catch (err) {
            console.log("Error al obtener usuario:", err);
            res.status(500).json({ success: false, message: "Error al obtener usuario", data: null });
        }
    });

    // Actualizar usuario (protegido)
    router.put("user/:id", authenticateToken, async (req: Request, res: Response) => {
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
                res.status(400).json({ success: false, message: "Nada para actualizar", data: null });
                return;
            }
            values.push(req.params.id);
            await db.query(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, values);
            res.json({ success: true, message: "Usuario actualizado", data: null });
        } catch (err) {
            console.log("Error al actualizar usuario:", err);
            res.status(500).json({ success: false, message: "Error al actualizar usuario", data: null });
        }
    });

    // Eliminar usuario (protegido)
    router.delete("user/:id", authenticateToken, async (req: Request, res: Response) => {
        try {
            await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
            res.json({ success: true, message: "Usuario eliminado", data: null });
        } catch (err) {
            console.log("Error al eliminar usuario:", err);
            res.status(500).json({ success: false, message: "Error al eliminar usuario", data: null });
        }
    });

    return router;
} 