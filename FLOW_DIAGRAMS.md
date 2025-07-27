# Diagramas de Flujo - Taskbot-API

## 1. Proceso de Inicialización del Servidor

```mermaid
flowchart TD
    A[Servidor inicia] --> B[Importar dependencias]
    B --> C[Configurar Express app]
    C --> D[Configurar middleware global]
    D --> E[Configurar cola de procesamiento]
    E --> F[Configurar logging middleware]
    F --> G[Configurar body parser]
    
    G --> H[Registrar rutas]
    H --> I[/api/user routes]
    H --> J[/api/task routes]
    H --> K[/api/subtask routes]
    H --> L[/api/mcp routes]
    
    I --> M[Middleware de autenticación]
    J --> N[Middleware de autenticación]
    K --> O[Middleware de autenticación]
    L --> P[Middleware de autenticación]
    
    M --> Q[Conectar a base de datos]
    N --> Q
    O --> Q
    P --> Q
    
    Q --> R{¿Conexión exitosa?}
    R -->|Sí| S[Iniciar servidor en puerto]
    R -->|No| T[Error de conexión DB]
    
    S --> U[Servidor listo]
    T --> V[Terminar proceso]
```

## 2. Proceso de Autenticación y Autorización

```mermaid
flowchart TD
    A[Petición HTTP] --> B[Middleware de cola]
    B --> C[Middleware de logging]
    C --> D[Router específico]
    
    D --> E{¿Ruta protegida?}
    E -->|Sí| F[Middleware authenticateToken]
    E -->|No| G[Procesar petición]
    
    F --> H[Extraer token del header]
    H --> I{¿Token presente?}
    I -->|Sí| J[Verificar JWT]
    I -->|No| K[Error 401 - Token requerido]
    
    J --> L{¿Token válido?}
    L -->|Sí| M[Verificar usuario en DB]
    L -->|No| N[Error 403 - Token inválido]
    
    M --> O{¿Usuario existe?}
    O -->|Sí| P[Agregar user a req]
    O -->|No| Q[Error 404 - Usuario no encontrado]
    
    P --> R[Procesar petición]
    G --> R
    
    K --> S[Respuesta de error]
    N --> S
    Q --> S
    R --> T[Respuesta exitosa]
```

## 3. Proceso de Gestión de Usuarios

```mermaid
flowchart TD
    A[POST /api/register] --> B[Validar campos requeridos]
    B --> C{¿Campos completos?}
    C -->|Sí| D[Verificar email único]
    C -->|No| E[Error 400 - Campos faltantes]
    
    D --> F{¿Email existe?}
    F -->|No| G[Hashear password]
    F -->|Sí| H[Error 409 - Usuario ya existe]
    
    G --> I[Insertar usuario en DB]
    I --> J{¿Inserción exitosa?}
    J -->|Sí| K[Generar JWT token]
    J -->|No| L[Error 500 - Error de DB]
    
    K --> M[Obtener usuario creado]
    M --> N[Respuesta 201 con token]
    
    E --> O[Respuesta de error]
    H --> O
    L --> O
    
    P[POST /api/login] --> Q[Validar email/password]
    Q --> R{¿Campos válidos?}
    R -->|Sí| S[Buscar usuario por email]
    R -->|No| T[Error 400 - Campos requeridos]
    
    S --> U{¿Usuario encontrado?}
    U -->|Sí| V[Verificar password]
    U -->|No| W[Error 401 - Credenciales inválidas]
    
    V --> X{¿Password correcto?}
    X -->|Sí| Y[Generar JWT token]
    X -->|No| W
    
    Y --> Z[Eliminar password de respuesta]
    Z --> AA[Respuesta 200 con token]
    
    T --> BB[Respuesta de error]
    W --> BB
```

## 4. Proceso de Gestión de Tareas

```mermaid
flowchart TD
    A[GET /api/task] --> B[Autenticar usuario]
    B --> C{¿Autenticación exitosa?}
    C -->|Sí| D[Obtener user_id del token]
    C -->|No| E[Error de autenticación]
    
    D --> F[Query: SELECT * FROM tasks WHERE user_id = ?]
    F --> G{¿Query exitoso?}
    G -->|Sí| H[Devolver tareas del usuario]
    G -->|No| I[Error 500 - Error de DB]
    
    J[POST /api/task] --> K[Autenticar usuario]
    K --> L[Validar campos requeridos]
    L --> M{¿Campos válidos?}
    M -->|Sí| N[Insertar tarea en DB]
    M -->|No| O[Error 400 - Campos faltantes]
    
    N --> P{¿Inserción exitosa?}
    P -->|Sí| Q[Obtener tarea creada]
    P -->|No| R[Error 500 - Error de DB]
    
    Q --> S[Respuesta 201 con tarea]
    
    T[PUT /api/task/:id] --> U[Autenticar usuario]
    U --> V[Verificar propiedad de tarea]
    V --> W{¿Tarea existe y pertenece al usuario?}
    W -->|Sí| X[Actualizar campos especificados]
    W -->|No| Y[Error 404 - Tarea no encontrada]
    
    X --> Z{¿Actualización exitosa?}
    Z -->|Sí| AA[Obtener tarea actualizada]
    Z -->|No| BB[Error 500 - Error de DB]
    
    AA --> CC[Respuesta 200 con tarea]
    
    DD[DELETE /api/task/:id] --> EE[Autenticar usuario]
    EE --> FF[Verificar propiedad de tarea]
    FF --> GG{¿Tarea existe y pertenece al usuario?}
    GG -->|Sí| HH[Eliminar tarea de DB]
    GG -->|No| II[Error 404 - Tarea no encontrada]
    
    HH --> JJ{¿Eliminación exitosa?}
    JJ -->|Sí| KK[Respuesta 200 - Tarea eliminada]
    JJ -->|No| LL[Error 500 - Error de DB]
```

## 5. Proceso de Gestión de Subtareas

```mermaid
flowchart TD
    A[GET /api/task/:taskId/subtask] --> B[Autenticar usuario]
    B --> C[Verificar propiedad de tarea padre]
    C --> D{¿Tarea padre existe?}
    D -->|Sí| E[Obtener subtareas de la tarea]
    D -->|No| F[Error 404 - Tarea padre no encontrada]
    
    E --> G{¿Query exitoso?}
    G -->|Sí| H[Devolver subtareas]
    G -->|No| I[Error 500 - Error de DB]
    
    J[POST /api/task/:taskId/subtask] --> K[Autenticar usuario]
    K --> L[Verificar propiedad de tarea padre]
    L --> M[Validar campos de subtarea]
    M --> N{¿Campos válidos?}
    N -->|Sí| O[Insertar subtarea en DB]
    N -->|No| P[Error 400 - Campos faltantes]
    
    O --> Q{¿Inserción exitosa?}
    Q -->|Sí| R[Obtener subtarea creada]
    Q -->|No| S[Error 500 - Error de DB]
    
    R --> T[Respuesta 201 con subtarea]
    
    U[PUT /api/subtask/:id] --> V[Autenticar usuario]
    V --> W[Verificar propiedad de subtarea]
    W --> X{¿Subtarea existe y pertenece al usuario?}
    X -->|Sí| Y[Actualizar campos especificados]
    X -->|No| Z[Error 404 - Subtarea no encontrada]
    
    Y --> AA{¿Actualización exitosa?}
    AA -->|Sí| BB[Obtener subtarea actualizada]
    AA -->|No| CC[Error 500 - Error de DB]
    
    BB --> DD[Respuesta 200 con subtarea]
    
    EE[DELETE /api/subtask/:id] --> FF[Autenticar usuario]
    FF --> GG[Verificar propiedad de subtarea]
    GG --> HH{¿Subtarea existe y pertenece al usuario?}
    HH -->|Sí| II[Eliminar subtarea de DB]
    HH -->|No| JJ[Error 404 - Subtarea no encontrada]
    
    II --> KK{¿Eliminación exitosa?}
    KK -->|LL[Respuesta 200 - Subtarea eliminada]
    KK -->|MM[Error 500 - Error de DB]
```

## 6. Proceso de Integración MCP

```mermaid
flowchart TD
    A[Petición MCP] --> B[Middleware de autenticación]
    B --> C{¿Token válido?}
    C -->|Sí| D[Router MCP]
    C -->|No| E[Error de autenticación]
    
    D --> F[POST /api/mcp] --> G[Validar petición]
    G --> H{¿Petición válida?}
    H -->|Sí| I[Procesar comando MCP]
    H -->|No| J[Error 400 - Petición inválida]
    
    I --> K[Ejecutar herramienta solicitada]
    K --> L{¿Herramienta existe?}
    L -->|Sí| M[Validar parámetros]
    L -->|No| N[Error 404 - Herramienta no encontrada]
    
    M --> O{¿Parámetros válidos?}
    O -->|Sí| P[Ejecutar operación en DB]
    O -->|No| Q[Error 400 - Parámetros inválidos]
    
    P --> R{¿Operación exitosa?}
    R -->|Sí| S[Devolver resultado]
    R -->|No| T[Error 500 - Error de operación]
    
    S --> U[Respuesta 200 con resultado]
    
    J --> V[Respuesta de error]
    N --> V
    Q --> V
    T --> V
```

## 7. Proceso de Manejo de Errores

```mermaid
flowchart TD
    A[Petición HTTP] --> B[Try Block]
    B --> C{¿Operación exitosa?}
    C -->|Sí| D[Procesar respuesta]
    C -->|No| E[Catch Block]
    
    E --> F[Clasificar error]
    F --> G{¿Error de validación?}
    G -->|Sí| H[Error 400 - Campos inválidos]
    G -->|No| I{¿Error de autenticación?}
    
    I -->|Sí| J[Error 401/403 - Token inválido]
    I -->|No| K{¿Error de autorización?}
    
    K -->|Sí| L[Error 404 - Recurso no encontrado]
    K -->|No| M{¿Error de base de datos?}
    
    M -->|Sí| N[Error 500 - Error interno]
    M -->|No| O[Error 500 - Error genérico]
    
    D --> P[Formatear respuesta exitosa]
    H --> Q[Formatear error de validación]
    J --> R[Formatear error de auth]
    L --> S[Formatear error de autorización]
    N --> T[Log error de DB]
    O --> U[Log error genérico]
    
    P --> V[Enviar respuesta 200/201]
    Q --> W[Enviar respuesta 400]
    R --> X[Enviar respuesta 401/403]
    S --> Y[Enviar respuesta 404]
    T --> Z[Enviar respuesta 500]
    U --> AA[Enviar respuesta 500]
```

## 8. Proceso de Cola de Procesamiento

```mermaid
flowchart TD
    A[Nueva petición HTTP] --> B{¿Procesando actualmente?}
    B -->|No| C[Procesar inmediatamente]
    B -->|Sí| D[Agregar a cola]
    
    C --> E[Establecer processing = true]
    E --> F[Procesar petición]
    F --> G[Respuesta enviada]
    G --> H[Establecer processing = false]
    H --> I{¿Hay peticiones en cola?}
    I -->|Sí| J[Procesar siguiente petición]
    I -->|No| K[Esperar nueva petición]
    
    D --> L[Agregar a queue array]
    L --> M[Esperar turno]
    M --> N[Procesar cuando sea turno]
    N --> E
    
    J --> E
    K --> A
```

## 9. Proceso de Conexión a Base de Datos

```mermaid
flowchart TD
    A[Servidor inicia] --> B[Importar configuración DB]
    B --> C[Crear pool de conexiones]
    C --> D{¿Configuración válida?}
    D -->|Sí| E[Intentar conexión]
    D -->|No| F[Error de configuración]
    
    E --> G{¿Conexión exitosa?}
    G -->|Sí| H[Pool listo para uso]
    G -->|No| I[Error de conexión]
    
    H --> J[Servidor listo]
    I --> K[Terminar proceso]
    F --> K
    
    L[Petición requiere DB] --> M[Obtener conexión del pool]
    M --> N{¿Conexión disponible?}
    N -->|Sí| O[Ejecutar query]
    N -->|No| P[Esperar conexión disponible]
    
    O --> Q{¿Query exitoso?}
    Q -->|Sí| R[Devolver conexión al pool]
    Q -->|No| S[Error de query]
    
    R --> T[Procesar resultado]
    S --> U[Log error]
    P --> M
```

## 10. Proceso de Logging y Monitoreo

```mermaid
flowchart TD
    A[Petición HTTP] --> B[Middleware de logging]
    B --> C[Log timestamp]
    C --> D[Log método HTTP]
    D --> E[Log URL]
    E --> F[Log headers relevantes]
    F --> G[Log body si es POST/PUT]
    G --> H[Continuar procesamiento]
    
    H --> I[Procesar petición]
    I --> J[Respuesta generada]
    J --> K[Log status code]
    K --> L[Log tiempo de respuesta]
    L --> M[Log errores si existen]
    M --> N[Enviar respuesta]
    
    O[Error ocurre] --> P[Log error completo]
    P --> Q[Log stack trace]
    Q --> R[Log contexto de error]
    R --> S[Enviar error al cliente]
    
    T[Evento importante] --> U[Log evento]
    U --> V[Log datos relevantes]
    V --> W[Log timestamp]
    W --> X[Continuar flujo]
``` 