import { createMcpHandler } from '@vercel/mcp-adapter';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

// Configuración de la base de datos
let db: any;
let JWT_SECRET: string;

// Inicializar la conexión a la base de datos
async function initializeDatabase() {
  try {
    console.log('🔧 [MCP] Inicializando conexión a base de datos...');
    console.log('🔧 [MCP] Variables de entorno:', {
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_USER: process.env.DB_USER || 'root',
      DB_NAME: process.env.DB_NAME || 'taskbot_db',
      JWT_SECRET: process.env.JWT_SECRET ? '***' : 'your-secret-key'
    });
    
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'taskbot_db'
    });
    JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    console.log('✅ [MCP] Base de datos conectada exitosamente');
  } catch (error) {
    console.error('❌ [MCP] Error conectando a la base de datos:', error);
    throw error;
  }
}

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

// Implementar las funciones de las herramientas
async function listTasks(args: { token: string }) {
  try {
    console.log('🔧 [MCP] listTasks: Iniciando...');
    const user = await verifyToken(args.token);
    console.log('🔧 [MCP] listTasks: Usuario autenticado:', user.id);
    
    const [rows] = await db.query("SELECT * FROM tasks WHERE user_id = ?", [user.id]) as [any[], any];
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
      status: args.status || 'Pendiente',
      is_ai_managed: true
    };
    
    const [result] = await db.query(
      "INSERT INTO tasks (user_id, created_by, name, description, priority, due_date, status, is_ai_managed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [taskData.user_id, taskData.created_by, taskData.name, taskData.description, taskData.priority, taskData.due_date, taskData.status, taskData.is_ai_managed]
    );
    
    const [newTask] = await db.query("SELECT * FROM tasks WHERE id = ?", [result.insertId]) as [any[], any];
    
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
    
    // Verificar que la tarea existe y pertenece al usuario
    const [existingTask] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [args.task_id, user.id]) as [any[], any];
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
    await db.query(`UPDATE tasks SET ${updateFields.join(", ")} WHERE id = ? AND user_id = ?`, [...values, user.id]);
    
    const [updatedTask] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [args.task_id, user.id]) as [any[], any];
    
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
    
    // Verificar que la tarea existe y pertenece al usuario
    const [existingTask] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [args.task_id, user.id]) as [any[], any];
    if (existingTask.length === 0) {
      return {
        success: false,
        message: "Tarea no encontrada o no tienes permisos para eliminarla",
        data: null
      };
    }
    
    await db.query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [args.task_id, user.id]);
    
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

// Crear el adaptador MCP de Vercel
const handler = createMcpHandler(
  (server) => {
    server.tool(
      'list_tasks',
      'Lista todas las tareas del usuario autenticado',
      { token: { type: 'string', description: 'Token JWT del usuario' } },
      async ({ token }) => {
        const result = await listTasks({ token });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    );

    server.tool(
      'create_task',
      'Crea una nueva tarea para el usuario',
      { 
        token: { type: 'string', description: 'Token JWT del usuario' },
        name: { type: 'string', description: 'Nombre de la tarea' },
        description: { type: 'string', description: 'Descripción de la tarea', optional: true },
        priority: { type: 'string', description: 'Prioridad (high, medium, low)', optional: true },
        due_date: { type: 'string', description: 'Fecha límite (YYYY-MM-DD HH:mm:ss)', optional: true },
        status: { type: 'string', description: 'Estado (Pendiente, En progreso, Completado)', optional: true }
      },
      async ({ token, name, description, priority, due_date, status }) => {
        const result = await createTask({ token, name, description, priority, due_date, status });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    );

    server.tool(
      'update_task',
      'Actualiza una tarea existente',
      { 
        token: { type: 'string', description: 'Token JWT del usuario' },
        task_id: { type: 'number', description: 'ID de la tarea' },
        name: { type: 'string', description: 'Nuevo nombre', optional: true },
        description: { type: 'string', description: 'Nueva descripción', optional: true },
        priority: { type: 'string', description: 'Nueva prioridad', optional: true },
        due_date: { type: 'string', description: 'Nueva fecha límite', optional: true },
        status: { type: 'string', description: 'Nuevo estado', optional: true }
      },
      async ({ token, task_id, name, description, priority, due_date, status }) => {
        const result = await updateTask({ token, task_id, name, description, priority, due_date, status });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    );

    server.tool(
      'delete_task',
      'Elimina una tarea existente',
      { 
        token: { type: 'string', description: 'Token JWT del usuario' },
        task_id: { type: 'number', description: 'ID de la tarea' }
      },
      async ({ token, task_id }) => {
        const result = await deleteTask({ token, task_id });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    );
  },
  {},
  { basePath: '/api' },
);

// Inicializar base de datos al cargar el módulo
initializeDatabase().catch(console.error);

export { handler as GET, handler as POST, handler as DELETE }; 