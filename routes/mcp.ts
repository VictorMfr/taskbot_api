import { Router } from "express";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";

export default function mcpRoutes(db: mysql.Pool, JWT_SECRET: string) {
    const router = Router();

    // Función para verificar token JWT
    async function verifyToken(token: string): Promise<any> {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const [users] = await db.query("SELECT * FROM users WHERE id = ?", [decoded.id]) as [any[], any];
            if (users.length === 0) {
                throw new Error("Usuario no encontrado");
            }
            return users[0];
        } catch (error) {
            throw new Error("Token inválido");
        }
    }

    // Función para listar tareas
    async function listTasks(userId: number) {
        try {
            console.log('🔧 [MCP] listTasks: Iniciando para usuario:', userId);
            
            const [rows] = await db.query("SELECT * FROM tasks WHERE user_id = ?", [userId]) as [any[], any];
            console.log('🔧 [MCP] listTasks: Tareas encontradas:', rows.length);
            
            return {
                success: true,
                message: "Tareas obtenidas exitosamente",
                data: rows,
                count: rows.length
            };
        } catch (error: any) {
            console.error('❌ [MCP] listTasks: Error:', error.message);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // Función para crear tarea
    async function createTask(userId: number, taskData: any) {
        try {
            console.log('🔧 [MCP] createTask: Creando tarea para usuario:', userId);
            
            const taskInfo = {
                user_id: userId,
                created_by: userId,
                name: taskData.name,
                description: taskData.description || '',
                priority: taskData.priority || 'medium',
                due_date: taskData.due_date || null,
                status: taskData.status || 'Pendiente',
                is_ai_managed: true
            };
            
            const [result] = await db.query(
                "INSERT INTO tasks (user_id, created_by, name, description, priority, due_date, status, is_ai_managed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [taskInfo.user_id, taskInfo.created_by, taskInfo.name, taskInfo.description, taskInfo.priority, taskInfo.due_date, taskInfo.status, taskInfo.is_ai_managed]
            ) as [any, any];
            
            const [newTask] = await db.query("SELECT * FROM tasks WHERE id = ?", [result.insertId]) as [any[], any];
            
            return {
                success: true,
                message: `Tarea "${taskData.name}" creada exitosamente`,
                data: newTask[0]
            };
        } catch (error: any) {
            console.error('❌ [MCP] createTask: Error:', error.message);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // Función para actualizar tarea
    async function updateTask(userId: number, taskId: number, updates: any) {
        try {
            console.log('🔧 [MCP] updateTask: Actualizando tarea:', taskId);
            
            // Verificar que la tarea existe y pertenece al usuario
            const [existingTask] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]) as [any[], any];
            if (existingTask.length === 0) {
                return {
                    success: false,
                    message: "Tarea no encontrada o no tienes permisos para modificarla",
                    data: null
                };
            }
            
            let updateFields: string[] = [];
            let values: (string | number)[] = [];
            
            if (updates.name) { updateFields.push("name = ?"); values.push(updates.name); }
            if (updates.description) { updateFields.push("description = ?"); values.push(updates.description); }
            if (updates.priority) { updateFields.push("priority = ?"); values.push(updates.priority); }
            if (updates.due_date) { updateFields.push("due_date = ?"); values.push(updates.due_date); }
            if (updates.status) { updateFields.push("status = ?"); values.push(updates.status); }
            
            if (updateFields.length === 0) {
                return {
                    success: false,
                    message: "Nada para actualizar",
                    data: null
                };
            }
            
            values.push(taskId);
            await db.query(`UPDATE tasks SET ${updateFields.join(", ")} WHERE id = ? AND user_id = ?`, [...values, userId]);
            
            const [updatedTask] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]) as [any[], any];
            
            return {
                success: true,
                message: `Tarea #${taskId} actualizada exitosamente`,
                data: updatedTask[0]
            };
        } catch (error: any) {
            console.error('❌ [MCP] updateTask: Error:', error.message);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // Función para eliminar tarea
    async function deleteTask(userId: number, taskId: number) {
        try {
            console.log('🔧 [MCP] deleteTask: Eliminando tarea:', taskId);
            
            // Verificar que la tarea existe y pertenece al usuario
            const [existingTask] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]) as [any[], any];
            if (existingTask.length === 0) {
                return {
                    success: false,
                    message: "Tarea no encontrada o no tienes permisos para eliminarla",
                    data: null
                };
            }
            
            await db.query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]);
            
            return {
                success: true,
                message: `Tarea #${taskId} eliminada exitosamente`,
                data: null
            };
        } catch (error: any) {
            console.error('❌ [MCP] deleteTask: Error:', error.message);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // Endpoint principal para MCP
    router.post("/mcp", async (req, res) => {
        try {
            console.log('🔧 [MCP] Petición recibida:', req.body);
            
            const { tool, args } = req.body;
            
            if (!tool) {
                return res.status(400).json({
                    success: false,
                    message: 'Herramienta no especificada'
                });
            }
            
            // Verificar token
            const token = args.token;
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token no proporcionado'
                });
            }
            
            const user = await verifyToken(token);
            console.log('✅ [MCP] Usuario autenticado:', user.id);
            
            let result;
            
            switch (tool) {
                case 'list_tasks':
                    result = await listTasks(user.id);
                    break;
                case 'create_task':
                    result = await createTask(user.id, args);
                    break;
                case 'update_task':
                    result = await updateTask(user.id, args.task_id, args);
                    break;
                case 'delete_task':
                    result = await deleteTask(user.id, args.task_id);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: `Herramienta '${tool}' no reconocida`
                    });
            }
            
            console.log('✅ [MCP] Resultado procesado:', result);
            res.json(result);
            
        } catch (error: any) {
            console.error('❌ [MCP] Error procesando petición:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error interno del servidor'
            });
        }
    });

    return router;
} 