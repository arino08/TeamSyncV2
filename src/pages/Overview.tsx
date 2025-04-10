import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, Activity, Calendar, Users } from 'lucide-react';
import axios from 'axios';

// Define statistics interface to match API response
interface Statistics {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  workspace_count: number;
  team_member_count: number;
}

const mockActivities = [
  { id: 1, type: 'task_completed', task: 'Update website content', workspace: 'Marketing', time: '2 hours ago', user: 'You' },
  { id: 2, type: 'task_assigned', task: 'Design new logo', workspace: 'Design', time: '4 hours ago', user: 'Alex Smith' },
  { id: 3, type: 'workspace_joined', workspace: 'Product Development', time: 'Yesterday', user: 'You' },
  { id: 4, type: 'task_comment', task: 'Fix navigation bug', workspace: 'Development', time: 'Yesterday', user: 'Sarah Johnson' },
  { id: 5, type: 'task_deadline', task: 'Q3 Report', workspace: 'Management', time: '2 days ago', user: 'System' },
];

export default function Overview() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState<Statistics>({
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    overdue_tasks: 0,
    workspace_count: 0,
    team_member_count: 0
  });

  useEffect(() => {
    const fetchStatistics = async () => {
      setIsLoading(true);
      try {
        // Update the URL to point to the backend FastAPI server
        const response = await axios.get('http://localhost:8000/api/statistics');
        setStatistics(response.data);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white shadow rounded-lg"
      >
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-2xl leading-6 font-bold text-gray-900">
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
      </motion.div>

      {/* Statistics Section */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white shadow rounded-lg p-5">
              <div className="animate-pulse h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          <motion.div variants={itemVariants} className="bg-white shadow rounded-lg p-5 hover:shadow-md transition duration-300 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completed Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.completed_tasks}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <div className="mt-4">
              <div className="bg-gray-200 h-2 rounded-full">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(statistics.completed_tasks/statistics.total_tasks)*100}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{Math.round((statistics.completed_tasks/statistics.total_tasks)*100)}% of total tasks</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white shadow rounded-lg p-5 hover:shadow-md transition duration-300 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.pending_tasks}</p>
              </div>
              <Clock className="h-10 w-10 text-blue-500" />
            </div>
            <div className="mt-4">
              <div className="bg-gray-200 h-2 rounded-full">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(statistics.pending_tasks/statistics.total_tasks)*100}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{Math.round((statistics.pending_tasks/statistics.total_tasks)*100)}% of total tasks</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white shadow rounded-lg p-5 hover:shadow-md transition duration-300 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Overdue Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.overdue_tasks}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <div className="mt-4">
              <div className="bg-gray-200 h-2 rounded-full">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(statistics.overdue_tasks/statistics.total_tasks)*100}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{Math.round((statistics.overdue_tasks/statistics.total_tasks)*100)}% of total tasks</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white shadow rounded-lg p-5 hover:shadow-md transition duration-300 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.total_tasks}</p>
              </div>
              <Activity className="h-10 w-10 text-purple-500" />
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500">Across {statistics.workspace_count} workspaces</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white shadow rounded-lg p-5 hover:shadow-md transition duration-300 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Workspaces</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.workspace_count}</p>
              </div>
              <Calendar className="h-10 w-10 text-yellow-500" />
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500">Active workspaces</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white shadow rounded-lg p-5 hover:shadow-md transition duration-300 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Team Members</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.team_member_count}</p>
              </div>
              <Users className="h-10 w-10 text-indigo-500" />
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500">Collaborating with you</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Recent Activity Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="bg-white shadow rounded-lg overflow-hidden"
      >
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
          <p className="mt-1 text-sm text-gray-500">Latest updates from your workspaces</p>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-4 sm:px-6 animate-pulse">
                <div className="flex items-center">
                  <div className="rounded-full bg-gray-200 h-10 w-10 mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <ul className="divide-y divide-gray-200">
              {mockActivities.map((activity, index) => (
                <motion.li
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  whileHover={{ backgroundColor: "rgba(249, 250, 251, 1)" }}
                  className="px-4 py-4 sm:px-6"
                >
                  <div className="flex items-center">
                    <ActivityIcon type={activity.type} />
                    <div className="ml-4 flex-1">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {formatActivity(activity)}
                        </p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.workspace}
                      </p>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 text-center">
          <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
            View all activity
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ActivityIcon({ type }) {
  const iconClasses = "h-10 w-10 rounded-full flex items-center justify-center";

  switch (type) {
    case 'task_completed':
      return <div className={`${iconClasses} bg-green-100`}><CheckCircle className="h-5 w-5 text-green-600" /></div>;
    case 'task_assigned':
      return <div className={`${iconClasses} bg-blue-100`}><Users className="h-5 w-5 text-blue-600" /></div>;
    case 'workspace_joined':
      return <div className={`${iconClasses} bg-purple-100`}><Calendar className="h-5 w-5 text-purple-600" /></div>;
    case 'task_comment':
      return <div className={`${iconClasses} bg-yellow-100`}><Activity className="h-5 w-5 text-yellow-600" /></div>;
    case 'task_deadline':
      return <div className={`${iconClasses} bg-red-100`}><Clock className="h-5 w-5 text-red-600" /></div>;
    default:
      return <div className={`${iconClasses} bg-gray-100`}><Activity className="h-5 w-5 text-gray-600" /></div>;
  }
}

function formatActivity(activity: { id: number; type: string; task: string; workspace: string; time: string; user: string; } | { id: number; type: string; workspace: string; time: string; user: string; task?: undefined; }) {
  switch (activity.type) {
    case 'task_completed':
      return `${activity.user} completed "${activity.task}"`;
    case 'task_assigned':
      return `${activity.user} assigned "${activity.task}"`;
    case 'workspace_joined':
      return `${activity.user} joined ${activity.workspace}`;
    case 'task_comment':
      return `${activity.user} commented on "${activity.task}"`;
    case 'task_deadline':
      return `"${activity.task}" deadline is approaching`;
    default:
      return 'Unknown activity';
  }
}
