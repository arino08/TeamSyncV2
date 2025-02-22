import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  status: 'todo' | 'completed';
}

interface TaskDetailsProps {
  taskId: string;
  title: string;
  description: string;
  workspaceName: string;
  status: string;
  assignedToName: string;
  subtasks: Subtask[];
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
}

const TaskDetails: React.FC<TaskDetailsProps> = ({
  taskId,
  title,
  description,
  workspaceName,
  status,
  assignedToName,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}) => {
  const [newSubtask, setNewSubtask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;

    setIsAdding(true);
    try {
      await onAddSubtask(taskId, newSubtask);
      setNewSubtask('');
    } finally {
      setIsAdding(false);
    }
  };

  const completedCount = subtasks.filter(st => st.status === 'completed').length;
  const progress = subtasks.length ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
          {workspaceName}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-2">{description}</p>

      <div className="text-sm text-gray-500 mb-4">
        Assigned to: <span className="font-medium">{assignedToName}</span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 rounded-full h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            placeholder="Add a subtask..."
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isAdding || !newSubtask.trim()}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>

        <ul className="space-y-2">
          {subtasks.map((subtask) => (
            <li
              key={subtask.id}
              className="flex items-center justify-between group"
            >
              <div className="flex items-center">
                <button
                  onClick={() => onToggleSubtask(taskId, subtask.id, subtask.status === 'todo')}
                  className={`p-1 rounded-full hover:bg-gray-100 ${
                    subtask.status === 'completed' ? 'text-green-500' : 'text-gray-400'
                  }`}
                >
                  {subtask.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <span
                  className={`ml-2 text-sm ${
                    subtask.status === 'completed'
                      ? 'text-gray-400 line-through'
                      : 'text-gray-700'
                  }`}
                >
                  {subtask.title}
                </span>
              </div>
              <button
                onClick={() => onDeleteSubtask(taskId, subtask.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TaskDetails;
