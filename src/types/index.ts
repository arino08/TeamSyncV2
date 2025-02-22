export type User = {
  id: string;
  email: string;
  name: string;
  role: 'manager' | 'member';
};

export type Workspace = {
  id: string;
  name: string;
  manager_id: string;
  created_at: string;
};

export type Task = {
  id: string;
  workspace_id: string;
  assigned_to: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  created_at: string;
};

export type Subtask = {
  id: string;
  task_id: string;
  title: string;
  status: 'todo' | 'completed';
  created_at: string;
};