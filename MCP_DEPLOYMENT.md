# Despliegue del MCP Server - TaskBot

## ¿Por qué separar el MCP del API principal?

El servidor MCP necesita ejecutarse como un proceso continuo, mientras que Vercel está optimizado para APIs REST con funciones serverless.

## Opciones de Despliegue para MCP

### Opción 1: Railway (Recomendado)

Railway es perfecto para procesos continuos como MCP:

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inicializar proyecto
railway init

# Agregar variables de entorno
railway variables set DB_HOST=tu-host
railway variables set DB_USER=tu-usuario
railway variables set DB_PASSWORD=tu-password
railway variables set DB_NAME=taskbot_db
railway variables set JWT_SECRET=tu-secret

# Desplegar
railway up
```

### Opción 2: Render

```bash
# Crear cuenta en render.com
# Conectar tu repositorio
# Configurar como "Web Service"
# Build Command: npm run build
# Start Command: node dist/mcp-server.js
```

### Opción 3: DigitalOcean App Platform

```bash
# Crear cuenta en DigitalOcean
# Conectar repositorio
# Configurar como aplicación Node.js
# Variables de entorno en el dashboard
```

### Opción 4: Heroku

```bash
# Instalar Heroku CLI
npm install -g heroku

# Login
heroku login

# Crear app
heroku create taskbot-mcp

# Configurar variables
heroku config:set DB_HOST=tu-host
heroku config:set DB_USER=tu-usuario
heroku config:set DB_PASSWORD=tu-password
heroku config:set DB_NAME=taskbot_db
heroku config:set JWT_SECRET=tu-secret

# Desplegar
git push heroku main
```

## Configuración del MCP Server

### 1. Crear script de build para MCP
 