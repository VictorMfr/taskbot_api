# Despliegue de TaskBot API en Vercel

## Configuración Actual

Tu `vercel.json` está ahora correctamente configurado para el despliegue con MCP integrado.

### Cambios realizados:

1. **Rutas corregidas**: 
   - `/api/mcp` ahora apunta correctamente a `/api/mcp/route.ts`
   - Eliminada la ruta duplicada `/mcp/(.*)`

2. **Builds separados**: 
   - `index.ts` para la API principal
   - `api/mcp/route.ts` para el endpoint MCP

3. **Runtime configurado**: Node.js 18.x para ambos endpoints

4. **Logs de seguimiento**: Agregados console.log para debugging

## Variables de Entorno Requeridas

Configura estas variables en el dashboard de Vercel:

```bash
DB_HOST=tu-host-mysql
DB_USER=tu-usuario-mysql
DB_PASSWORD=tu-password-mysql
DB_NAME=taskbot_db
JWT_SECRET=tu-secret-jwt-super-seguro
NODE_ENV=production
```

## Comandos de Despliegue

### 1. Instalar Vercel CLI (si no lo tienes):
```bash
npm i -g vercel
```

### 2. Login en Vercel:
```bash
vercel login
```

### 3. Desplegar:
```bash
vercel --prod
```

### 4. Configurar variables de entorno:
```bash
vercel env add DB_HOST
vercel env add DB_USER
vercel env add DB_PASSWORD
vercel env add DB_NAME
vercel env add JWT_SECRET
```

## Endpoints Disponibles

### API Principal:
- `GET /` - Health check
- `POST /api/register` - Registro de usuarios
- `POST /api/login` - Login de usuarios
- `GET /api/auth` - Verificar autenticación
- `GET /api/task` - Listar tareas
- `POST /api/task` - Crear tarea
- `PUT /api/task/:id` - Actualizar tarea
- `DELETE /api/task/:id` - Eliminar tarea

### MCP Endpoint:
- `POST /api/mcp` - Endpoint MCP para IA

## Verificación del Despliegue

1. **Health Check**: `https://tu-app.vercel.app/`
2. **MCP Endpoint**: `https://tu-app.vercel.app/api/mcp`

## Troubleshooting

### Si hay errores de build:
1. Verifica que todas las dependencias estén en `package.json`
2. Asegúrate de que `tsconfig.json` esté configurado correctamente
3. Revisa los logs en el dashboard de Vercel

### Si hay errores de conexión a BD:
1. Verifica las variables de entorno
2. Asegúrate de que la BD esté accesible desde Vercel
3. Considera usar PlanetScale o Railway para MySQL

### Si MCP no funciona:
1. Verifica que `@vercel/mcp-adapter` esté instalado
2. Revisa los logs en `/api/mcp`
3. Asegúrate de que el token JWT sea válido

## Logs de Seguimiento

La aplicación incluye logs detallados con prefijos:
- `🔧 [SERVER]` - Logs del servidor principal
- `🔧 [MCP]` - Logs del endpoint MCP
- `✅` - Operaciones exitosas
- `❌` - Errores

Revisa estos logs en el dashboard de Vercel para debugging. 