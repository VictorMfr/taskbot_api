import { createMcpHandler } from '@vercel/mcp-adapter';
import { experimental_withMcpAuth } from '@vercel/mcp-adapter';
import jwt from 'jsonwebtoken';
import db from '../../db';
import { z } from 'zod';

// Esquemas de validación con Zod
const CreateTaskSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  due_date: z.string().datetime().optional(),
  status: z.enum(['pending', 'completed']).optional().default('pending'),
});

const UpdateTaskSchema = z.object({
  task_id: z.number().int().positive("ID de tarea inválido"),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_date: z.string().datetime().optional(),
  status: z.enum(['pending', 'completed']).optional(),
});

const DeleteTaskSchema = z.object({
  task_id: z.number().int().positive("ID de tarea inválido"),
});

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
      console.log(`🔧 [MCP] Intento ${attempt} de ejecutar query`);
      const result = await db.query(query, params);
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ [MCP] Error en intento ${attempt}:`, error.message);
      
      if (attempt < maxRetries) {
        // Esperar un poco antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}

// Implementar las funciones de las herramientas
async function listTasks(args: { token: string }, extra?: any) {
  try {
    // Usar el token del contexto de autorización MCP si está disponible
    const user = extra?.authInfo ? 
      { id: extra.authInfo.extra?.userId } : 
      await verifyToken(args.token);
    
    const [rows] = await executeQuery("SELECT * FROM tasks WHERE user_id = ?", [user.id]) as [any[], any];
    
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
}, extra?: any) {
  try {
    // Usar el token del contexto de autorización MCP si está disponible
    const user = extra?.authInfo ? 
      { id: extra.authInfo.extra?.userId } : 
      await verifyToken(args.token);
    
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
}, extra?: any) {
  try {
    // Usar el token del contexto de autorización MCP si está disponible
    const user = extra?.authInfo ? 
      { id: extra.authInfo.extra?.userId } : 
      await verifyToken(args.token);
    
    // Verificar que la tarea existe y pertenece al usuario
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

async function deleteTask(args: { token: string, task_id: number }, extra?: any) {
  try {
    // Usar el token del contexto de autorización MCP si está disponible
    const user = extra?.authInfo ? 
      { id: extra.authInfo.extra?.userId } : 
      await verifyToken(args.token);
    
    // Verificar que la tarea existe y pertenece al usuario
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

// Crear el adaptador MCP de Vercel con validación Zod
const handler = createMcpHandler(
  (server) => {
    server.tool(
      'list_tasks',
      'Lista todas las tareas del usuario autenticado',
      {}, // Sin parámetros, la autenticación se maneja automáticamente
      async (args, extra) => {
        const result = await listTasks({ token: '' }, extra);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    );

    server.tool(
      'create_task',
      'Crea una nueva tarea para el usuario',
      {
        name: z.string().min(1, "El nombre es requerido"),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
        due_date: z.string().datetime().optional(),
        status: z.enum(['pending', 'completed']).optional().default('pending'),
      },
      async (args, extra) => {
        const result = await createTask({ 
          token: '', 
          name: args.name,
          description: args.description,
          priority: args.priority,
          due_date: args.due_date,
          status: args.status
        }, extra);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    );

    server.tool(
      'update_task',
      'Actualiza una tarea existente',
      {
        task_id: z.number().int().positive("ID de tarea inválido"),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        due_date: z.string().datetime().optional(),
        status: z.enum(['pending', 'completed']).optional(),
      },
      async (args, extra) => {
        const result = await updateTask({ 
          token: '', 
          task_id: args.task_id,
          name: args.name,
          description: args.description,
          priority: args.priority,
          due_date: args.due_date,
          status: args.status
        }, extra);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    );

    server.tool(
      'delete_task',
      'Elimina una tarea existente',
      {
        task_id: z.number().int().positive("ID de tarea inválido"),
      },
      async (args, extra) => {
        const result = await deleteTask({ 
          token: '', 
          task_id: args.task_id
        }, extra);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    );
  },
  {},
  { basePath: '/api' },
);

// Función para verificar token Bearer
const verifyBearerToken = async (req: Request, bearerToken?: string) => {
  if (!bearerToken) return undefined;

  try {
    const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET || 'supersecret') as any;
    const [users] = await executeQuery("SELECT * FROM users WHERE id = ?", [decoded.id]) as [any[], any];
    
    if (users.length === 0) {
      return undefined;
    }

    return {
      token: bearerToken,
      scopes: ["read:tasks", "write:tasks"],
      clientId: decoded.id,
      extra: {
        userId: decoded.id,
      },
    };
  } catch {
    return undefined;
  }
};

// Aplicar autorización MCP
const authHandler = experimental_withMcpAuth(handler, verifyBearerToken, {
  required: true,
  requiredScopes: ["read:tasks"],
});

// Función para manejar peticiones HTTP normales
async function handleHttpRequest(request: any) {
  try {
    const body = await request.json();
    const { tool, args } = body;
    
    console.log('🔧 [MCP-HTTP] Petición HTTP recibida:', { tool, args });
    
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
        return new Response(
          JSON.stringify({ success: false, message: 'Herramienta no encontrada' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [MCP-HTTP] Error en petición HTTP:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Función para manejar peticiones HTTP
export async function POST(request: any) {
  // Verificar si es una petición MCP o HTTP normal
  try {
    const contentType = request.headers.get('content-type');
    console.log('🔧 [MCP] Content-Type:', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      // Es una petición HTTP normal
      return handleHttpRequest(request);
    } else {
      // Es una petición MCP
      return authHandler(request);
    }
  } catch (error) {
    console.error('❌ [MCP] Error determinando tipo de petición:', error);
    // Por defecto, intentar como HTTP normal
    return handleHttpRequest(request);
  }
}

// Exportar también GET y DELETE para compatibilidad
export { authHandler as GET, authHandler as DELETE }; 