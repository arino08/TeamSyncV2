import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { Plus, Loader2, Users, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Workspaces() {
  const { user } = useAuthStore();
  const { workspaces = [], loading, error, createWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  useEffect(() => {
    fetchWorkspaces().catch(console.error);
  }, [fetchWorkspaces]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    try {
      await createWorkspace(newWorkspaceName);
      setNewWorkspaceName('');
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading && !workspaces.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Workspaces
          </h2>
        </div>
        {user?.role === 'manager' && (
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <form onSubmit={handleCreateWorkspace} className="flex space-x-3">
              <input
                type="text"
                placeholder="New workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
              <button
                type="submit"
                disabled={isCreating || !newWorkspaceName.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workspace
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.isArray(workspaces) && workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                {workspace.name}
              </h3>
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <Users className="flex-shrink-0 mr-1.5 h-5 w-5" />
                <span>{workspace.member_count || 0} members</span>
                <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 ml-4" />
                <span>
                  Created {new Date(workspace.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex justify-end">
                <Link
                  to={`/dashboard/workspaces/${workspace.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && !error && (!workspaces || workspaces.length === 0) && (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No workspaces</h3>
          <p className="mt-1 text-sm text-gray-500">
            {user?.role === 'manager'
              ? 'Get started by creating a new workspace.'
              : 'You haven\'t been assigned to any workspaces yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
