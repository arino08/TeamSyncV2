import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Plus, UserPlus, X, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';
import TaskCard from '../components/TaskCard';

interface Member {
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
  assignedToName: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export default function WorkspaceDetails() {
  const { workspaceId } = useParams();
  const { user } = useAuthStore();
  const { addMember, removeMember } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: ''
  });
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace();
      fetchMembers();
      fetchTasks();
    }
  }, [workspaceId]);

  const fetchWorkspace = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching workspace with token:', token);

      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Workspace response:', response);

      if (!response.ok) {
        throw new Error(`Failed to fetch workspace: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Workspace data:', data);

      if (!data.workspace) {
        throw new Error('No workspace data received');
      }

      setWorkspace(data.workspace);
    } catch (err) {
      console.error('Error fetching workspace:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workspace');
    }
  };

  const fetchMembers = async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await response.json();
      console.log('Fetched members:', data);
      setMembers(data.members || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!workspaceId) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to fetch tasks');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !newMemberEmail) return;

    setAddingMember(true);
    try {
      await addMember(workspaceId, newMemberEmail);
      setNewMemberEmail('');
      setShowAddMember(false);
      await fetchMembers(); // Refresh member list
    } catch (err) {
      setError('Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspaceId || !memberId) return;

    try {
      await removeMember(workspaceId, memberId);
      await fetchMembers(); // Refresh member list
    } catch (err) {
      setError('Failed to remove member');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement task creation
    if (!workspaceId || !newTask.title || !newTask.assignedTo) return;

    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTask)
      });

      setShowAddTask(false);
      setNewTask({ title: '', description: '', assignedTo: '' });
      await fetchTasks(); // Refresh tasks after adding
    } catch (error) {
      setError('Failed to create task');
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update task status');
      }

      const data = await response.json();
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error('Failed to update task status:', error);
      setError('Failed to update task status');
    }
  };

  // Add Member Modal Content
  const AddMemberModalContent = () => (
    <form onSubmit={handleAddMember}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <input
            type="email"
            value={newMemberEmail}
            onChange={e => setNewMemberEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="team@example.com"
            required
          />
        </div>
      </div>
      <div className="mt-5 sm:mt-6 flex space-x-3">
        <button
          type="button"
          onClick={() => setShowAddMember(false)}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={addingMember}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {addingMember ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Member'}
        </button>
      </div>
    </form>
  );

  // Add Task Modal Content
  const AddTaskModalContent = () => (
    <form onSubmit={handleAddTask}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={newTask.title}
            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={newTask.description}
            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Assign To</label>
          <select
            value={newTask.assignedTo}
            onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          >
            <option value="">Select team member</option>
            {members.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-5 sm:mt-6 flex space-x-3">
        <button
          type="button"
          onClick={() => setShowAddTask(false)}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create Task
        </button>
      </div>
    </form>
  );

  const renderMembersList = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      );
    }

    if (members.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          No members in this workspace yet.
        </div>
      );
    }

    return (
      <ul className="divide-y divide-gray-200">
        {members.map((member) => (
          <li key={member.id} className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{member.name}</p>
              <p className="text-sm text-gray-500">{member.email}</p>
            </div>
            {user?.role === 'manager' && member.id !== user.id && (
              <button
                onClick={() => handleRemoveMember(member.id)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  };

// Move these outside the main WorkspaceDetails component
const AddMemberModal = ({
  isOpen,
  onClose,
  onSubmit,
  loading
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  loading: boolean;
}) => {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email);
    setEmail('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Team Member" maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="team@example.com"
              required
            />
          </div>
        </div>
        <div className="mt-5 sm:mt-6 flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const AddTaskModal = ({
  isOpen,
  onClose,
  onSubmit,
  members
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: { title: string; description: string; assignedTo: string }) => Promise<void>;
  members: Member[];
}) => {
  const [task, setTask] = useState({
    title: '',
    description: '',
    assignedTo: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(task);
    setTask({ title: '', description: '', assignedTo: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task" maxWidth="md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={task.title}
              onChange={e => setTask({ ...task, title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={task.description}
              onChange={e => setTask({ ...task, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="assignee" className="block text-sm font-medium text-gray-700">
              Assign To
            </label>
            <select
              id="assignee"
              value={task.assignedTo}
              onChange={e => setTask({ ...task, assignedTo: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            >
              <option value="">Select team member</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 sm:mt-6 flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Create Task
          </button>
        </div>
      </form>
    </Modal>
  );
};

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              {workspace?.name || 'Loading...'}
            </h2>
          </div>
          {user?.role === 'manager' && (
            <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
              <button
                onClick={() => setShowAddMember(true)}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Team Members
            </h3>
            {user?.role === 'manager' && (
              <button
                onClick={() => setShowAddMember(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          {renderMembersList()}
        </div>
      </div>

      <Modal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Add Team Member"
        maxWidth="sm"
      >
        <AddMemberModalContent />
      </Modal>

      {/* Tasks Section */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Tasks</h3>
            <button
              onClick={() => setShowAddTask(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
              />
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        title="Create New Task"
        maxWidth="md"
        >
        <AddTaskModalContent />
      </Modal>
        <AddMemberModal
      isOpen={showAddMember}
      onClose={() => setShowAddMember(false)}
      onSubmit={async (email) => {
        try {
          await addMember(workspaceId!, email);
          setShowAddMember(false);
          await fetchMembers();
        } catch (err) {
          setError('Failed to add member');
        }
      }}
      loading={addingMember}
    />

    <AddTaskModal
      isOpen={showAddTask}
      onClose={() => setShowAddTask(false)}
      onSubmit={async (task) => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(task)
            });

            if (!response.ok) {
              throw new Error('Failed to create task');
            }

            const data = await response.json();
            setTasks([...tasks, data.task]);
            setShowAddTask(false);
         } catch (err) {
        }
      }}
      members={members}
    />
  </div>
  );
}
