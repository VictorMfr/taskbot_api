-- Base de datos para la aplicación de tareas TaskBot con funcionalidad de IA
-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS taskbot;
USE taskbot;

-- Tabla de usuarios (incluye tanto usuarios humanos como entidades de IA)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    user_type ENUM('human', 'ai_assistant') DEFAULT 'human',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de prompts para la IA
CREATE TABLE ai_prompts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    prompt_text TEXT NOT NULL,
    response_text TEXT,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de tareas principales
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    created_by INT NOT NULL, -- Quién creó la tarea (usuario o IA)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    due_date DATETIME,
    status ENUM('pending', 'in_progress', 'completed', 'ai_generated', 'ai_processing') DEFAULT 'pending',
    is_ai_managed BOOLEAN DEFAULT FALSE, -- Si la IA está gestionando esta tarea
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de subtareas
CREATE TABLE subtasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    created_by INT NOT NULL, -- Quién creó la subtarea
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    due_date DATETIME,
    status ENUM('pending', 'in_progress', 'completed', 'ai_generated', 'ai_processing') DEFAULT 'pending',
    is_ai_managed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de auditoría para todas las acciones
CREATE TABLE audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action_type ENUM('create', 'update', 'delete', 'status_change', 'ai_action') NOT NULL,
    table_name ENUM('tasks', 'subtasks', 'users', 'ai_prompts') NOT NULL,
    record_id INT NOT NULL,
    old_values JSON,
    new_values JSON,
    ai_prompt_id INT NULL, -- Si la acción fue resultado de un prompt de IA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ai_prompt_id) REFERENCES ai_prompts(id) ON DELETE SET NULL
);

-- Tabla de configuración de IA por usuario
CREATE TABLE ai_user_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    ai_enabled BOOLEAN DEFAULT TRUE,
    ai_permissions JSON, -- Permisos específicos para la IA
    auto_task_management BOOLEAN DEFAULT FALSE,
    notification_preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_is_ai_managed ON tasks(is_ai_managed);

CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX idx_subtasks_status ON subtasks(status);
CREATE INDEX idx_subtasks_due_date ON subtasks(due_date);
CREATE INDEX idx_subtasks_created_by ON subtasks(created_by);
CREATE INDEX idx_subtasks_is_ai_managed ON subtasks(is_ai_managed);

CREATE INDEX idx_ai_prompts_user_id ON ai_prompts(user_id);
CREATE INDEX idx_ai_prompts_status ON ai_prompts(status);
CREATE INDEX idx_ai_prompts_created_at ON ai_prompts(created_at);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Insertar usuario de IA por defecto
INSERT INTO users (username, email, password, user_type) VALUES
('ai_assistant', 'ai@taskbot.com', 'ai_password_hash', 'ai_assistant');

-- Configuración por defecto para usuarios
INSERT INTO ai_user_config (user_id, ai_enabled, ai_permissions, auto_task_management) VALUES
(1, TRUE, '{"create_tasks": true, "update_tasks": true, "delete_tasks": false, "manage_subtasks": true}', FALSE);