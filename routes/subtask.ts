import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export default function subtaskRoutes(db: any, JWT_SECRET: string) {
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

    // Obtener todas las subtareas
    router.get("/subtask", authenticateToken, async (req: Request, res: Response) => {
        try {
            console.log("Obteniendo todas las subtareas");
            const [rows] = await db.query("SELECT * FROM subtasks") as [any[], any];
            console.log("Subtareas obtenidas:", rows.length);
            res.json({ success: true, message: "Subtareas obtenidas", data: rows });
        } catch (err) {
            console.log("Error al obtener subtareas:", err);
            res.status(500).json({ success: false, message: "Error al obtener subtareas", data: null });
        }
    });

    // Obtener subtareas por task_id
    router.get("/subtask/task/:taskId", authenticateToken, async (req: Request, res: Response) => {
        try {
            console.log("Obteniendo subtareas para task_id:", req.params.taskId);
            const [rows] = await db.query("SELECT * FROM subtasks WHERE task_id = ?", [req.params.taskId]) as [any[], any];
            console.log("Subtareas encontradas:", rows.length);
            res.json({ success: true, message: "Subtareas obtenidas", data: rows });
        } catch (err) {
            console.log("Error al obtener subtareas por task_id:", err);
            res.status(500).json({ success: false, message: "Error al obtener subtareas", data: null });
        }
    });

    // Obtener subtarea por ID
    router.get("/subtask/:id", authenticateToken, async (req: Request, res: Response) => {
        try {
            console.log("Obteniendo subtarea con id:", req.params.id);
            const [rows] = await db.query("SELECT * FROM subtasks WHERE id = ?", [req.params.id]) as [any[], any];
            if (rows.length === 0) {
                res.status(404).json({ success: false, message: "Subtarea no encontrada", data: null });
                return;
            }
            console.log("Subtarea encontrada:", rows[0]);
            res.json({ success: true, message: "Subtarea obtenida", data: rows[0] });
        } catch (err) {
            console.log("Error al obtener subtarea:", err);
            res.status(500).json({ success: false, message: "Error al obtener subtarea", data: null });
        }
    });

    // Crear subtarea
    router.post("/subtask", authenticateToken, async (req: Request, res: Response) => {
        const { task_id, created_by, name, description, priority, due_date, status, is_ai_managed } = req.body;
        
        console.log("Creando subtarea con datos:", { task_id, created_by, name, description, priority, due_date, status, is_ai_managed });
        
        if (!task_id || !created_by || !name) {
            res.status(400).json({ success: false, message: "Faltan campos obligatorios (task_id, created_by, name)", data: null });
            return;
        }

        try {
            // Verificar que la tarea padre existe
            const [taskRows] = await db.query("SELECT * FROM tasks WHERE id = ?", [task_id]) as [any[], any];
            if (taskRows.length === 0) {
                res.status(404).json({ success: false, message: "Tarea padre no encontrada", data: null });
                return;
            }

            const [result] = await db.query(
                "INSERT INTO subtasks (task_id, created_by, name, description, priority, due_date, status, is_ai_managed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [task_id, created_by, name, description, priority, due_date, status, is_ai_managed]
            );
            
            const [rows] = await db.query("SELECT * FROM subtasks WHERE id = ?", [result.insertId]) as [any[], any];
            console.log("Subtarea creada con id:", result.insertId);
            res.status(201).json({ success: true, message: "Subtarea creada", data: rows[0] });
        } catch (err) {
            console.log("Error al crear subtarea:", err);
            res.status(500).json({ success: false, message: "Error al crear subtarea", data: null });
        }
    });

    // Actualizar subtarea
    router.put("/subtask/:id", authenticateToken, async (req: Request, res: Response) => {
        const { name, description, priority, due_date, status, is_ai_managed } = req.body;
        
        console.log("Actualizando subtarea con id:", req.params.id, "datos:", req.body);
        
        try {
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
            
            values.push(req.params.id);
            await db.query(`UPDATE subtasks SET ${updateFields.join(", ")} WHERE id = ?`, values);
            
            const [rows] = await db.query("SELECT * FROM subtasks WHERE id = ?", [req.params.id]) as [any[], any];
            console.log("Subtarea actualizada:", rows[0]);
            res.json({ success: true, message: "Subtarea actualizada", data: rows[0] });
        } catch (err) {
            console.log("Error al actualizar subtarea:", err);
            res.status(500).json({ success: false, message: "Error al actualizar subtarea", data: null });
        }
    });

    // Eliminar subtarea
    router.delete("/subtask/:id", authenticateToken, async (req: Request, res: Response) => {
        try {
            console.log("Eliminando subtarea con id:", req.params.id);
            await db.query("DELETE FROM subtasks WHERE id = ?", [req.params.id]);
            console.log("Subtarea eliminada exitosamente");
            res.json({ success: true, message: "Subtarea eliminada", data: null });
        } catch (err) {
            console.log("Error al eliminar subtarea:", err);
            res.status(500).json({ success: false, message: "Error al eliminar subtarea", data: null });
        }
    });

    // Obtener subtareas completadas
    router.get("/subtask/completed", authenticateToken, async (req: Request, res: Response) => {
        try {
            console.log("Obteniendo subtareas completadas");
            const [rows] = await db.query("SELECT * FROM subtasks WHERE status = 'completed'") as [any[], any];
            console.log("Subtareas completadas encontradas:", rows.length);
            res.json({ success: true, message: "Subtareas completadas obtenidas", data: rows });
        } catch (err) {
            console.log("Error al obtener subtareas completadas:", err);
            res.status(500).json({ success: false, message: "Error al obtener subtareas completadas", data: null });
        }
    });

    // Obtener subtareas pendientes
    router.get("/subtask/pending", authenticateToken, async (req: Request, res: Response) => {
        try {
            console.log("Obteniendo subtareas pendientes");
            const [rows] = await db.query("SELECT * FROM subtasks WHERE status = 'pending'") as [any[], any];
            console.log("Subtareas pendientes encontradas:", rows.length);
            res.json({ success: true, message: "Subtareas pendientes obtenidas", data: rows });
        } catch (err) {
            console.log("Error al obtener subtareas pendientes:", err);
            res.status(500).json({ success: false, message: "Error al obtener subtareas pendientes", data: null });
        }
    });

    // Cambiar estado de subtarea
    router.patch("/subtask/:id/status", authenticateToken, async (req: Request, res: Response) => {
        const { status } = req.body;
        
        console.log("Cambiando estado de subtarea con id:", req.params.id, "a:", status);
        
        if (!status) {
            res.status(400).json({ success: false, message: "Estado requerido", data: null });
            return;
        }

        try {
            await db.query("UPDATE subtasks SET status = ? WHERE id = ?", [status, req.params.id]);
            const [rows] = await db.query("SELECT * FROM subtasks WHERE id = ?", [req.params.id]) as [any[], any];
            console.log("Estado de subtarea actualizado:", rows[0]);
            res.json({ success: true, message: "Estado de subtarea actualizado", data: rows[0] });
        } catch (err) {
            console.log("Error al actualizar estado de subtarea:", err);
            res.status(500).json({ success: false, message: "Error al actualizar estado de subtarea", data: null });
        }
    });

    return router;
} 