import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import TaskDetails from '../components/TaskDetails';
import { Loader2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  workspace_id: string;
  workspace_name: string;
  assignedToName: string;
  subtasks: Subtask[];
}

interface Subtask {
  id: string;
  title: string;
  status: 'todo' | 'completed';
}

export default function Tasks() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('auth_token');

      console.log('Fetching tasks with token:', token?.substring(0, 10) + '...');

      const response = await fetch('/api/tasks/assigned', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tasks');
      }

      const data = await response.json();
      console.log('Received tasks:', data);
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubtask = async (taskId: string, title: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });

      if (!response.ok) throw new Error('Failed to add subtask');

      const { subtask } = await response.json();
      setTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, subtasks: [...task.subtasks, subtask] }
          : task
      ));
    } catch (err) {
      setError('Failed to add subtask');
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, completed: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/tasks/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          status: completed ? 'completed' : 'todo'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update subtask');
      }

      const data = await response.json();
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, ...data.task } : task
        )
      );
    } catch (err) {
      console.error('Failed to update subtask:', err);
      setError(err instanceof Error ? err.message : 'Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete subtask');

      setTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, subtasks: task.subtasks.filter(st => st.id !== subtaskId) }
          : task
      ));
    } catch (err) {
      setError('Failed to delete subtask');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">!</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No tasks assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map(task => (
            <TaskDetails
              key={task.id}
              taskId={task.id}
              title={task.title}
              description={task.description}
              workspaceName={task.workspace_name}
              status={task.status}
              assignedToName={task.assignedToName}
              subtasks={task.subtasks}
              onAddSubtask={handleAddSubtask}
              onToggleSubtask={handleToggleSubtask}
              onDeleteSubtask={handleDeleteSubtask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
