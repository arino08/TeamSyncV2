import mysql from 'mysql2/promise';
import { DATABASE_URI } from '../config.js';

const tables = [
  // Profiles table
  `CREATE TABLE IF NOT EXISTS profiles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    role ENUM('manager','member') NOT NULL DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Auth users table
  `CREATE TABLE IF NOT EXISTS auth_users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE
  )`,

  // Workspaces table
  `CREATE TABLE IF NOT EXISTS workspaces (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    manager_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE CASCADE
  )`,

  // Tasks table
  `CREATE TABLE IF NOT EXISTS tasks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    workspace_id CHAR(36) NOT NULL,
    assigned_to CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('todo','in_progress','completed') DEFAULT 'todo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES profiles(id)
  )`,

  // Workspace tasks table
  `CREATE TABLE IF NOT EXISTS workspace_tasks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    workspace_id CHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
    assigned_to CHAR(36),
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES auth_users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES auth_users(id) ON DELETE SET NULL
  )`,

  // Subtasks table
`CREATE TABLE IF NOT EXISTS subtasks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  task_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('todo', 'completed') DEFAULT 'todo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES workspace_tasks(id) ON DELETE CASCADE
)`,

  // Workspace members table
  `CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id CHAR(36),
    user_id CHAR(36),
    role ENUM('manager', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
  )`
];

export async function initializeDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(DATABASE_URI);

    console.log('Creating tables...');

    // Execute each table creation separately
    for (const tableQuery of tables) {
      try {
        await connection.query(tableQuery);
        console.log('Table created successfully');
      } catch (error) {
        console.error('Error creating table:', error.message);
        throw error;
      }
    }

    // Verify tables exist
    const tableNames = ['profiles', 'auth_users', 'workspaces', 'tasks', 'subtasks', 'workspace_members', 'workspace_tasks'];
    for (const table of tableNames) {
      const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);
      console.log(`Table ${table}: ${rows.length > 0 ? 'exists' : 'missing'}`);
    }

    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
