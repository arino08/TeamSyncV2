import React from 'react';
import { useAuthStore } from '../store/authStore';

export default function Overview() {
  const { user } = useAuthStore();

  return (
    <div>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">
            Welcome back, {user?.name}!
          </h2>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              {user?.role === 'manager'
                ? 'Manage your workspaces and assign tasks to team members.'
                : 'View your assigned tasks and track your progress.'}
            </p>
          </div>
        </div>
      </div>

      {/* We'll add statistics and recent activity here later */}
    </div>
  );
}