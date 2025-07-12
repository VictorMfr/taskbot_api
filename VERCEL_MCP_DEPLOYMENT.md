# Despliegue MCP en Vercel - TaskBot

## ✅ Configuración Completa para Vercel con MCP

Basándome en la [documentación oficial de Vercel sobre MCP](https://vercel.com/docs/mcp), he configurado el proyecto para usar el soporte nativo de Vercel para MCP servers.

## Arquitectura del Proyecto

### 📁 Archivos Principales

1. **`index.ts`** - API REST principal (autenticación, tareas, subtareas)
2. **`mcp-server-vercel.ts`** - Servidor MCP usando `@vercel/mcp-adapter`
3. **`vercel.json`** - Configuración de rutas y builds

### 🔄 Flujo de Datos

```
React Native App
    ↓
API REST (Vercel) ←→ MCP Server (Vercel)
    ↓
Base de Datos MySQL
```

## Configuración Actual

### 1. Dependencias Agregadas
```json
{
  "@vercel/mcp-adapter": "^0.1.0"
}
```

### 2. Rutas Configuradas
- **API REST**: `/api/*` → `index.ts`
- **MCP Server**: `/mcp/*` → `mcp-server-vercel.ts`

### 3. Variables de Entorno Requeridas
```
DB_HOST=tu-host-mysql
DB_USER=tu-usuario-mysql
DB_PASSWORD=tu-password-mysql
DB_NAME=taskbot_db
JWT_SECRET=tu-secret-key-segura
```

## Despliegue en Vercel

### Paso 1: Instalar Vercel CLI
```bash
npm i -g vercel
```

### Paso 2: Login y Configuración
```bash
vercel login
vercel
```

### Paso 3: Configurar Variables de Entorno
En el dashboard de Vercel, agrega las variables de entorno mencionadas arriba.

### Paso 4: Desplegar
```bash
vercel --prod
```

## Herramientas MCP Disponibles

### 1. `list_tasks`
- **Descripción**: Lista todas las tareas del usuario autenticado
- **Parámetros**: `token` (JWT del usuario)

### 2. `create_task`
- **Descripción**: Crea una nueva tarea
- **Parámetros**: `token`, `name`, `description?`, `priority?`, `due_date?`, `status?`

### 3. `update_task`
- **Descripción**: Actualiza una tarea existente
- **Parámetros**: `token`, `task_id`, `name?`, `description?`, `priority?`, `due_date?`, `status?`

### 4. `delete_task`
- **Descripción**: Elimina una tarea
- **Parámetros**: `token`, `task_id`

## Ventajas de esta Configuración

### ✅ Beneficios
1. **Un solo despliegue**: API REST y MCP en la misma plataforma
2. **Escalabilidad automática**: Vercel maneja el escalado
3. **Integración nativa**: Soporte oficial de Vercel para MCP
4. **Costos optimizados**: Solo pagas por uso
5. **Despliegue simplificado**: Un solo comando

### 🔧 Características Técnicas
- **Runtime**: Node.js 18.x
- **Módulos**: ES modules
- **TypeScript**: Compilación automática
- **Base de datos**: MySQL externa
- **Autenticación**: JWT

## Troubleshooting

### Error: "Cannot find module '@vercel/mcp-adapter'"
```bash
npm install @vercel/mcp-adapter
```

### Error: "Database connection failed"
- Verifica las variables de entorno en Vercel
- Asegúrate de que la base de datos sea accesible desde Vercel

### Error: "MCP server not responding"
- Verifica que la URL del MCP en el hook sea correcta
- Revisa los logs en Vercel dashboard

## URLs de Despliegue

Después del despliegue, actualiza estas URLs en tu app React Native:

```typescript
// En constants/axios.ts
export const API_BASE_URL = 'https://tu-app.vercel.app/api';

// En hooks/useMCPChat.ts
const mcpConfig = {
  servers: [
    {
      url: 'https://tu-app.vercel.app/mcp',
      // ... resto de configuración
    }
  ]
};
```

## Monitoreo

### Logs en Vercel
- Ve a tu proyecto en Vercel dashboard
- Sección "Functions" para ver logs de API
- Sección "Functions" para ver logs de MCP

### Métricas
- **API calls**: Monitoreadas automáticamente
- **MCP calls**: Disponibles en logs
- **Performance**: Métricas automáticas de Vercel

¡Tu proyecto está listo para desplegarse en Vercel con soporte completo para MCP! 🚀 