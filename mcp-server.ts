import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import jwt from 'jsonwebtoken';

// Configuración de la base de datos (importar desde el archivo existente)
let db: any;
let JWT_SECRET: string;

// Inicializar la conexión a la base de datos
async function initializeDatabase() {
  try {
    const mysql = require('mysql2/promise');
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'taskbot_db'
    });
    JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    console.log('✅ Base de datos MCP conectada');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos MCP:', error);
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

// Definir las herramientas (tools) disponibles para la IA
const tools: Tool[] = [
  {
    name: 'list_tasks',
    description: 'Lista todas las tareas del usuario autenticado',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token JWT del usuario'
        }
      },
      required: ['token']
    }
  },
  {
    name: 'create_task',
    description: 'Crea una nueva tarea para el usuario',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token JWT del usuario'
        },
        name: {
          type: 'string',
          description: 'Nombre de la tarea'
        },
        description: {
          type: 'string',
          description: 'Descripción de la tarea'
        },
        priority: {
          type: 'string',
          description: 'Prioridad de la tarea (high, medium, low)',
          enum: ['high', 'medium', 'low']
        },
        due_date: {
          type: 'string',
          description: 'Fecha límite de la tarea (YYYY-MM-DD HH:mm:ss)'
        },
        status: {
          type: 'string',
          description: 'Estado de la tarea',
          enum: ['Pendiente', 'En progreso', 'Completado']
        }
      },
      required: ['token', 'name']
    }
  },
  {
    name: 'update_task',
    description: 'Actualiza una tarea existente',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token JWT del usuario'
        },
        task_id: {
          type: 'number',
          description: 'ID de la tarea a actualizar'
        },
        name: {
          type: 'string',
          description: 'Nuevo nombre de la tarea'
        },
        description: {
          type: 'string',
          description: 'Nueva descripción de la tarea'
        },
        priority: {
          type: 'string',
          description: 'Nueva prioridad de la tarea (high, medium, low)',
          enum: ['high', 'medium', 'low']
        },
        due_date: {
          type: 'string',
          description: 'Nueva fecha límite de la tarea (YYYY-MM-DD HH:mm:ss)'
        },
        status: {
          type: 'string',
          description: 'Nuevo estado de la tarea',
          enum: ['Pendiente', 'En progreso', 'Completado']
        }
      },
      required: ['token', 'task_id']
    }
  },
  {
    name: 'delete_task',
    description: 'Elimina una tarea existente',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token JWT del usuario'
        },
        task_id: {
          type: 'number',
          description: 'ID de la tarea a eliminar'
        }
      },
      required: ['token', 'task_id']
    }
  },
  {
    name: 'update_all_tasks',
    description: 'Actualiza todas las tareas del usuario con un nuevo estado',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token JWT del usuario'
        },
        status: {
          type: 'string',
          description: 'Nuevo estado para todas las tareas',
          enum: ['Pendiente', 'En progreso', 'Completado']
        }
      },
      required: ['token', 'status']
    }
  }
];

// Implementar las funciones de las herramientas
async function listTasks(args: { token: string }) {
  try {
    const user = await verifyToken(args.token);
    const [rows] = await db.query("SELECT * FROM tasks WHERE user_id = ?", [user.id]) as [any[], any];
    
    return {
      success: true,
      message: "Tareas obtenidas exitosamente",
      data: rows,
      count: rows.length
    };
  } catch (error: any) {
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
    
    let updateFields = [];
    let values = [];
    
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

async function updateAllTasks(args: { token: string, status: string }) {
  try {
    const user = await verifyToken(args.token);
    
    const [result] = await db.query("UPDATE tasks SET status = ? WHERE user_id = ?", [args.status, user.id]) as [any[], any];
    
    return {
      success: true,
      message: `Todas las tareas han sido actualizadas a estado "${args.status}"`,
      data: {
        affectedRows: (result as any).affectedRows || 0
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

// Crear el servidor MCP
const server = new Server(
  {
    name: 'taskbot-mcp-server',
    version: '1.0.0',
  }
);

// Registrar las herramientas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;
  
  console.log(`[MCP] Llamando herramienta: ${name}`, args);
  
  try {
    let result;
    
    switch (name) {
      case 'list_tasks':
        result = await listTasks(args as { token: string });
        break;
      case 'create_task':
        result = await createTask(args as any);
        break;
      case 'update_task':
        result = await updateTask(args as any);
        break;
      case 'delete_task':
        result = await deleteTask(args as { token: string, task_id: number });
        break;
      case 'update_all_tasks':
        result = await updateAllTasks(args as { token: string, status: string });
        break;
      default:
        throw new Error(`Herramienta no encontrada: ${name}`);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: error.message,
            data: null
          }, null, 2)
        }
      ]
    };
  }
});

// Inicializar y ejecutar el servidor
async function main() {
  await initializeDatabase();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.log('🚀 Servidor MCP TaskBot iniciado');
}

main().catch(console.error); 