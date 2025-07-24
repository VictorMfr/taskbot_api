import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';

const router = express.Router();

// Pool de conexión importado desde db.ts

// Función para verificar token JWT
async function verifyToken(token: string): Promise<any> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret') as any;
    const [users] = await executeQuery("SELECT * FROM users WHERE id = ?", [decoded.id]) as [any[], any];
    if (users.length === 0) {
      throw new Error("Usuario no encontrado");
    }
    return users[0];
  } catch (error) {
    throw new Error("Token inválido");
  }
}

// Función para ejecutar queries con reintentos
async function executeQuery(query: string, params: any[] = []): Promise<any> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔧 [MCP-HTTP] Intento ${attempt} de ejecutar query`);
      const result = await db.query(query, params);
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ [MCP-HTTP] Error en intento ${attempt}:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}

// Implementar las funciones de las herramientas
async function listTasks(args: { token: string }) {
  try {
    console.log('🔧 [MCP-HTTP] listTasks: Iniciando...');
    const user = await verifyToken(args.token);
    console.log('🔧 [MCP-HTTP] listTasks: Usuario autenticado:', user.id);
    
    const [rows] = await executeQuery("SELECT * FROM tasks WHERE user_id = ?", [user.id]) as [any[], any];
    console.log('🔧 [MCP-HTTP] listTasks: Tareas encontradas:', rows.length);
    
    return {
      success: true,
      message: "Tareas obtenidas exitosamente",
      data: rows,
      count: rows.length
    };
  } catch (error: any) {
    console.error('❌ [MCP-HTTP] listTasks: Error:', error.message);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

async function createTask(args: { 
  token: string, 
  name: string, 
  description?: string, 
  priority?: string, 
  due_date?: string, 
  status?: string 
}) {
  try {
    const user = await verifyToken(args.token);
    
    const taskData = {
      user_id: user.id,
      created_by: user.id,
      name: args.name,
      description: args.description || '',
      priority: args.priority || 'medium',
      due_date: args.due_date || null,
      status: args.status || 'pending',
      is_ai_managed: true
    };
    
    const [result] = await executeQuery(
      "INSERT INTO tasks (user_id, created_by, name, description, priority, due_date, status, is_ai_managed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [taskData.user_id, taskData.created_by, taskData.name, taskData.description, taskData.priority, taskData.due_date, taskData.status, taskData.is_ai_managed]
    );
    
    const [newTask] = await executeQuery("SELECT * FROM tasks WHERE id = ?", [result.insertId]) as [any[], any];
    
    return {
      success: true,
      message: `Tarea "${args.name}" creada exitosamente`,
      data: newTask[0]
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

async function updateTask(args: { 
  token: string, 
  task_id: number, 
  name?: string, 
  description?: string, 
  priority?: string, 
  due_date?: string, 
  status?: string 
}) {
  try {
    const user = await verifyToken(args.token);
    
    const [existingTask] = await executeQuery("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [args.task_id, user.id]) as [any[], any];
    if (existingTask.length === 0) {
      return {
        success: false,
        message: "Tarea no encontrada o no tienes permisos para modificarla",
        data: null
      };
    }
    
    let updateFields: string[] = [];
    let values: (string | number)[] = [];
    
    if (args.name) { updateFields.push("name = ?"); values.push(args.name); }
    if (args.description) { updateFields.push("description = ?"); values.push(args.description); }
    if (args.priority) { updateFields.push("priority = ?"); values.push(args.priority); }
    if (args.due_date) { updateFields.push("due_date = ?"); values.push(args.due_date); }
    if (args.status) { updateFields.push("status = ?"); values.push(args.status); }
    
    if (updateFields.length === 0) {
      return {
        success: false,
        message: "Nada para actualizar",
        data: null
      };
    }
    
    values.push(args.task_id);
    await executeQuery(`UPDATE tasks SET ${updateFields.join(", ")} WHERE id = ? AND user_id = ?`, [...values, user.id]);
    
    const [updatedTask] = await executeQuery("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [args.task_id, user.id]) as [any[], any];
    
    return {
      success: true,
      message: `Tarea #${args.task_id} actualizada exitosamente`,
      data: updatedTask[0]
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

async function deleteTask(args: { token: string, task_id: number }) {
  try {
    const user = await verifyToken(args.token);
    
    const [existingTask] = await executeQuery("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [args.task_id, user.id]) as [any[], any];
    if (existingTask.length === 0) {
      return {
        success: false,
        message: "Tarea no encontrada o no tienes permisos para eliminarla",
        data: null
      };
    }
    
    await executeQuery("DELETE FROM tasks WHERE id = ? AND user_id = ?", [args.task_id, user.id]);
    
    return {
      success: true,
      message: `Tarea #${args.task_id} eliminada exitosamente`,
      data: null
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

// Endpoint para manejar peticiones MCP
router.post('/', async (req, res) => {
  try {
    const { tool, args } = req.body;
    
    console.log('🔧 [MCP-HTTP] Petición recibida:', { tool, args });
    
    let result;
    switch (tool) {
      case 'list_tasks':
        result = await listTasks(args);
        break;
      case 'create_task':
        result = await createTask(args);
        break;
      case 'update_task':
        result = await updateTask(args);
        break;
      case 'delete_task':
        result = await deleteTask(args);
        break;
      default:
        return res.status(404).json({ 
          success: false, 
          message: 'Herramienta no encontrada' 
        });
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('❌ [MCP-HTTP] Error en petición:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Inicializar base de datos


export default router; 