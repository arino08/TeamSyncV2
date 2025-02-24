import { create } from 'zustand';
import axios from 'axios';

interface WorkspaceStore {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  addMember: (workspaceId: string, email: string) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  createTask: (workspaceId: string, task: CreateTaskDTO) => Promise<void>;
  updateTaskStatus: (workspaceId: string, taskId: string, status: 'pending' | 'in-progress' | 'completed') => Promise<void>;
}

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  members: WorkspaceMember[];
  tasks: Task[];
}

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: string;
  createdBy: string;
  createdAt: string;
}

interface CreateTaskDTO {
  title: string;
  description: string;
  assignedTo: string;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaces: [],  // Initialize as empty array
  currentWorkspace: null,
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/workspaces', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Fetched workspaces:', response.data);

      set({
        workspaces: response.data.workspaces || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      set({
        workspaces: [],
        error: 'Failed to fetch workspaces',
        loading: false
      });
    }
  },

  createWorkspace: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post('/api/workspaces',
        { name },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      set(state => ({
        workspaces: [...state.workspaces, response.data.workspace],
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Failed to create workspace:', error);
      set({ error: 'Failed to create workspace', loading: false });
    }
  },

  addMember: async (workspaceId: string, email: string) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(
        `/api/workspaces/${workspaceId}/members`,
        { email },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      // Refresh workspace data
      const response = await axios.get(
        `/api/workspaces/${workspaceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      set(state => ({
        workspaces: state.workspaces.map(w =>
          w.id === workspaceId ? response.data.workspace : w
        ),
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Failed to add member:', error);
      set({ error: 'Failed to add member', loading: false });
    }
  },

  removeMember: async (workspaceId: string, memberId: string) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      set(state => ({
        workspaces: state.workspaces.map(w => {
          if (w.id === workspaceId) {
            return {
              ...w,
              members: w.members.filter(m => m.id !== memberId)
            };
          }
          return w;
        }),
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Failed to remove member:', error);
      set({ error: 'Failed to remove member', loading: false });
    }
  },

  createTask: async (workspaceId: string, task: CreateTaskDTO) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`/api/workspaces/${workspaceId}/tasks`, task, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      set(state => ({
        workspaces: state.workspaces.map(w => {
          if (w.id === workspaceId) {
            return {
              ...w,
              tasks: [...w.tasks, response.data.task]
            };
          }
          return w;
        }),
        loading: false,
        error: null
      }));
    } catch (error) {
      set({ error: 'Failed to create task', loading: false });
    }
  },

  updateTaskStatus: async (workspaceId: string, taskId: string, status: "pending" | "in-progress" | "completed") => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('auth_token');
      await axios.patch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, { status }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const updateTask = (task: Task) =>
        task.id === taskId ? { ...task, status } : task;

      const updateWorkspace = (workspace: Workspace) => {
        if (workspace.id === workspaceId) {
          return { ...workspace, tasks: workspace.tasks.map(updateTask) };
        }
        return workspace;
      };

      set(state => ({
        workspaces: state.workspaces.map(updateWorkspace),
        loading: false,
        error: null
      }));
    } catch (error) {
      set({ error: 'Failed to update task status', loading: false });
    }
  }
}));

