import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import {
  LayoutDashboard,
  Link,
  Briefcase,
  Bot,
  Activity,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  BarChart3,
  Wrench,
  Zap,
  Moon,
  Sun,
} from 'lucide-react';

const AppShell = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navSections = [
    {
      title: 'Overview',
      items: [
        { path: '/app', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Trading',
      items: [
        { path: '/app/portfolio', label: 'Portfolio', icon: Briefcase },
      ]
    },
    {
      title: 'Tools',
      items: [
        { path: '/app/connections', label: 'Connections', icon: Link },
        { path: '/app/dcabot', label: 'DCA Bot', icon: Bot },
        { path: '/app/bots', label: 'Bots', icon: Bot },
        { path: '/clean-charts', label: 'Clean Charts', icon: BarChart3 },
        { path: '/app/backtest', label: 'Backtesting', icon: BarChart3 },
      ]
    },
    {
      title: 'Account',
      items: [
        { path: '/app/activity', label: 'Activity', icon: Activity },
        { path: '/app/settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const quickActions = [
    { label: 'Connect Exchange', icon: Plus, action: () => navigate('/app/connections') },
    { label: 'Create Bot', icon: Bot, action: () => navigate('/app/bots') },
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-r flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Tradeeon</h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Trading Platform</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              {!isCollapsed && (
                <button
                  onClick={toggleTheme}
                  className={`p-1.5 rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`p-1.5 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {!isCollapsed && (
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                      : 'text-gray-700 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <action.icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          {navSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="p-4">
              {!isCollapsed && (
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => (
                  <NavLink
                    key={itemIndex}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? theme === 'dark'
                            ? 'bg-blue-600 text-white border-r-2 border-blue-400'
                            : 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                          : theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                      } ${isCollapsed ? 'justify-center' : ''}`
                    }
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card */}
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          {isCollapsed ? (
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Status Pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>2 exchanges connected</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className={`h-3 w-3 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>Secure</span>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                  <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className={`p-1.5 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30'
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Outlet />
      </div>
    </div>
  );
};

export default AppShell;
