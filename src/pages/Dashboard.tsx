import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Menu, X, LogOut, Home, Briefcase, CheckSquare } from 'lucide-react';
import { useState } from 'react';

export default function Dashboard() {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path
      ? 'border-blue-500 text-gray-900'
      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700';

  const navigationItems = [
    { path: '/dashboard', label: 'Overview', icon: Home },
    { path: '/dashboard/workspaces', label: 'Workspaces', icon: Briefcase },
    { path: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-blue-600">TeamSync</span>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigationItems.map(({ path, label }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`${isActive(path)} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* User Info and Sign Out - Desktop */}
            <div className="hidden sm:flex sm:items-center sm:space-x-3">
              <span className="text-sm text-gray-700">{user?.name}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user?.role}
              </span>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

  {/* Mobile menu */}
  <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
    <div className="pt-2 pb-3 space-y-1">
      {navigationItems.map(({ path, label, icon: Icon }) => (
        <Link
          key={path}
          to={path}
          onClick={() => setIsMobileMenuOpen(false)}
          className={`${
            location.pathname === path
              ? 'bg-blue-50 border-blue-500 text-blue-700'
              : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
          } pl-3 pr-4 py-2 border-l-4 text-base font-medium flex items-center`}
        >
          <Icon className="h-5 w-5 mr-3" />
          {label}
        </Link>
      ))}
    </div>

    {/* Mobile user menu */}
    <div className="pt-4 pb-3 border-t border-gray-200">
      <div className="flex items-center px-4">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-medium">
              {user?.name?.charAt(0)}
            </span>
          </div>
        </div>
        <div className="ml-3">
          <div className="text-base font-medium text-gray-800">{user?.name}</div>
          <div className="text-sm font-medium text-gray-500">{user?.role}</div>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <button
          onClick={() => {
            signOut();
            setIsMobileMenuOpen(false);
          }}
          className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
        >
          <div className="flex items-center">
            <LogOut className="h-5 w-5 mr-3" />
            Sign out
          </div>
        </button>
      </div>
    </div>
  </div>
</nav>

{/* Main content */}
<div className="py-6">
  <main>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Outlet />
    </div>
  </main>
</div>
</div>
);
}
