# Despliegue en Vercel - TaskBot API

## Configuración Actual

El proyecto está configurado para desplegarse en Vercel con las siguientes características:

### Archivos de Configuración

1. **vercel.json**: Configuración del proyecto para Vercel
2. **package.json**: Configurado como ES module con scripts de build
3. **tsconfig.json**: Configurado para ESNext y Node.js
4. **.vercelignore**: Excluye archivos innecesarios del despliegue

### Variables de Entorno Requeridas

Configura estas variables en el dashboard de Vercel:

```
DB_HOST=tu-host-mysql
DB_USER=tu-usuario-mysql
DB_PASSWORD=tu-password-mysql
DB_NAME=taskbot_db
JWT_SECRET=tu-secret-key-segura
```

### Comandos de Despliegue

1. **Instalar Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login en Vercel**:
   ```bash
   vercel login
   ```

3. **Desplegar**:
   ```bash
   vercel --prod
   ```

### Estructura del Proyecto

- `index.ts`: Punto de entrada principal (API REST)
- `mcp-server.ts`: Servidor MCP para IA (separado)
- `routes/`: Rutas de la API
- `dist/`: Archivos compilados (generados automáticamente)

### Notas Importantes

1. **Base de Datos**: Asegúrate de que tu base de datos MySQL esté accesible desde Vercel
2. **Variables de Entorno**: Configúralas en el dashboard de Vercel
3. **MCP Server**: El servidor MCP está separado y no se despliega en Vercel
4. **Build Process**: Vercel compilará automáticamente el TypeScript

### Troubleshooting

- Si hay errores de build, revisa los logs en Vercel
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que la base de datos esté accesible desde Vercel 