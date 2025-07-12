import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export default function taskRoutes(db: any, JWT_SECRET: string) {
    const router = Router();

    // Middleware para verificar JWT
    function authenticateToken(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ success: false, message: "Token requerido", data: null });
            return;
        }
        jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
            if (err) {
                res.status(403).json({ success: false, message: "Token inválido", data: null });
                return;
            }
            
            try {
                console.log('DEBUG AUTH: Buscando usuario con id:', decoded.id, 'en base de datos:', process.env.DB_NAME, process.env.DB_HOST);
                // Verificar que el usuario existe en la base de datos
                const [users] = await db.query("SELECT * FROM users WHERE id = ?", [decoded.id]) as [any[], any];
                if (users.length === 0) {
                    res.status(404).json({ success: false, message: "Usuario no encontrado", data: null });
                    return;
                }
                
                (req as any).user = users[0];
                next();
            } catch (dbErr) {
                console.log("Error al verificar usuario:", dbErr);
                res.status(500).json({ success: false, message: "Error interno del servidor", data: null });
            }
        });
    }

    // Obtener todas las tareas del usuario autenticado
    router.get("/task", authenticateToken, async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            console.log('Obteniendo tareas para usuario:', userId);
            const [rows] = await db.query("SELECT * FROM tasks WHERE user_id = ?", [userId]) as [any[], any];
            res.json({ success: true, message: "Tareas obtenidas", data: rows });
        } catch (err) {
            console.log("Error al obtener tareas:", err);
            res.status(500).json({ success: false, message: "Error al obtener tareas", data: null });
        }
    });

    // Obtener tarea por ID (solo si pertenece al usuario autenticado)
    router.get("/task/:id", authenticateToken, async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            const taskId = req.params.id;
            console.log('Obteniendo tarea ID:', taskId, 'para usuario:', userId);
            
            const [rows] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]) as [any[], any];
            if (rows.length === 0) {
                res.status(404).json({ success: false, message: "Tarea no encontrada o no tienes permisos para acceder a ella", data: null });
                return;
            }
            res.json({ success: true, message: "Tarea obtenida", data: rows[0] });
        } catch (err) {
            console.log("Error al obtener tarea:", err);
            res.status(500).json({ success: false, message: "Error al obtener tarea", data: null });
        }
    });

    // Crear tarea
    router.post("/task", authenticateToken, async (req: Request, res: Response) => {
        const { user_id, created_by, name, description, priority, due_date, status, is_ai_managed } = req.body;
        if (!user_id || !created_by || !name) {
            res.status(400).json({ success: false, message: "Faltan campos obligatorios", data: null });
            return;
        }
        try {
            const [result] = await db.query(
                "INSERT INTO tasks (user_id, created_by, name, description, priority, due_date, status, is_ai_managed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [user_id, created_by, name, description, priority, due_date, status, is_ai_managed]
            );
            const [rows] = await db.query("SELECT * FROM tasks WHERE id = ?", [result.insertId]) as [any[], any];
            res.status(201).json({ success: true, message: "Tarea creada", data: rows[0] });
        } catch (err) {
            console.log("Error al crear tarea:", err);
            res.status(500).json({ success: false, message: "Error al crear tarea", data: null });
        }
    });

    // Actualizar tarea (solo si pertenece al usuario autenticado)
    router.put("/task/:id", authenticateToken, async (req: Request, res: Response) => {
        const { name, description, priority, due_date, status, is_ai_managed } = req.body;
        const userId = (req as any).user.id;
        const taskId = req.params.id;
        
        try {
            // Verificar que la tarea existe y pertenece al usuario
            const [existingTask] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]) as [any[], any];
            if (existingTask.length === 0) {
                res.status(404).json({ success: false, message: "Tarea no encontrada o no tienes permisos para modificarla", data: null });
                return;
            }
            
            let updateFields = [];
            let values = [];
            if (name) { updateFields.push("name = ?"); values.push(name); }
            if (description) { updateFields.push("description = ?"); values.push(description); }
            if (priority) { updateFields.push("priority = ?"); values.push(priority); }
            if (due_date) { updateFields.push("due_date = ?"); values.push(due_date); }
            if (status) { updateFields.push("status = ?"); values.push(status); }
            if (typeof is_ai_managed === "boolean") { updateFields.push("is_ai_managed = ?"); values.push(is_ai_managed); }
            if (updateFields.length === 0) {
                res.status(400).json({ success: false, message: "Nada para actualizar", data: null });
                return;
            }
            values.push(taskId);
            await db.query(`UPDATE tasks SET ${updateFields.join(", ")} WHERE id = ? AND user_id = ?`, [...values, userId]);
            const [rows] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]) as [any[], any];
            res.json({ success: true, message: "Tarea actualizada", data: rows[0] });
        } catch (err) {
            console.log("Error al actualizar tarea:", err);
            res.status(500).json({ success: false, message: "Error al actualizar tarea", data: null });
        }
    });

    // Eliminar tarea (solo si pertenece al usuario autenticado)
    router.delete("/task/:id", authenticateToken, async (req: Request, res: Response) => {
        const userId = (req as any).user.id;
        const taskId = req.params.id;
        
        try {
            // Verificar que la tarea existe y pertenece al usuario
            const [existingTask] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]) as [any[], any];
            if (existingTask.length === 0) {
                res.status(404).json({ success: false, message: "Tarea no encontrada o no tienes permisos para eliminarla", data: null });
                return;
            }
            
            await db.query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]);
            res.json({ success: true, message: "Tarea eliminada", data: null });
        } catch (err) {
            console.log("Error al eliminar tarea:", err);
            res.status(500).json({ success: false, message: "Error al eliminar tarea", data: null });
        }
    });

    return router;
} 