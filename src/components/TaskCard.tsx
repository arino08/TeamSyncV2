import React from 'react';
import { Clock, CheckCircle2, Circle } from 'lucide-react';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
    assignedTo: string;
    assignedToName: string; // Changed from nested object to flat structure
  };
  onStatusChange: (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800'
};

const statusIcons = {
  pending: Circle,
  'in-progress': Clock,
  completed: CheckCircle2
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange }) => {
  const StatusIcon = statusIcons[task.status];

  const nextStatus = {
    pending: 'in-progress',
    'in-progress': 'completed',
    completed: 'pending'
  } as const;

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
        <button
          onClick={() => onStatusChange(task.id, nextStatus[task.status])}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status]}`}
        >
          <StatusIcon className="w-4 h-4 mr-1" />
          {task.status.replace('-', ' ')}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-3">{task.description}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Assigned to:</span>
        <span className="font-medium text-gray-900">{task.assignedToName}</span>
      </div>
    </div>
  );
};

export default TaskCard;
