/*
  # Initial Schema Setup for Task Management App

  1. New Tables
    - users (managed by Supabase Auth)
    - workspaces
    - tasks
    - subtasks

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
*/

-- Create profiles table for MySQL
CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  name TEXT NOT NULL,
  role ENUM('manager','member') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create auth_users table for MySQL
CREATE TABLE IF NOT EXISTS auth_users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  FOREIGN KEY (id) REFERENCES profiles(id)
);

CREATE INDEX idx_auth_users_email ON auth_users(email);

-- Create workspaces table for MySQL
CREATE TABLE IF NOT EXISTS workspaces (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name TEXT NOT NULL,
  manager_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create tasks table for MySQL
CREATE TABLE IF NOT EXISTS tasks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  workspace_id CHAR(36) NOT NULL,
  assigned_to CHAR(36) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status ENUM('todo','in_progress','completed') DEFAULT 'todo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES profiles(id)
);

-- Create subtasks table for MySQL
CREATE TABLE IF NOT EXISTS subtasks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  task_id CHAR(36) NOT NULL,
  title TEXT NOT NULL,
  status ENUM('todo','completed') DEFAULT 'todo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
