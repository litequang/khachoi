import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LogOut, Settings, Plus, Menu, X, Database, Users, BarChart3, LayoutDashboard } from 'lucide-react';
import { CreateTaskModal } from './CreateTaskModal';
import { UserProfileModal } from './UserProfileModal';

const roleMap: Record<string, string> = {
  ADMIN: 'Quản trị',
  DESIGNER: 'Thiết kế',
  SALE: 'Sale',
};

export const Layout = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    const handleOpenModal = () => setIsCreateModalOpen(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('openCreateTaskModal', handleOpenModal);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('openCreateTaskModal', handleOpenModal);
    };
  }, []);

  if (!user) return null;

  return (
    <div 
      className="flex flex-col h-screen w-full font-sans bg-slate-100 text-slate-900 overflow-hidden select-none"
      style={{ backgroundImage: 'radial-gradient(at 0% 0%, hsla(210,100%,90%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(220,100%,85%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(200,100%,90%,1) 0, transparent 50%)' }}
    >
      {isOffline && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center text-sm font-medium text-yellow-800">
          Đang offline
        </div>
      )}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 bg-white/40 backdrop-blur-md border-b border-white/20 z-[60]">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="Logo" className="w-9 h-9 rounded-xl shadow-md shadow-blue-500/20 object-contain" />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-800 uppercase leading-none">
                Task Công Việc
              </span>
              <span className="hidden sm:block text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">
                Hệ thống quản lý tiến độ thiết kế
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 bg-white/50 p-1 rounded-2xl border border-white/60">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname === '/' 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Công việc</span>
            </Link>

            <Link
              to="/analytics"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                location.pathname === '/analytics' 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Phân tích</span>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-6">
          {/* User Profile */}
          <div className="hidden sm:flex items-center gap-3 bg-white/60 px-4 py-2 rounded-full border border-white/40 relative">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-800">{user.displayName || user.username || 'User'}</span>
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{roleMap[user.role] || user.role}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 hover:bg-white/40 rounded-full transition-colors focus:outline-none"
              >
                <Settings className="w-5 h-5 text-slate-600" />
              </button>

              {isSettingsOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-50">
                  <div className="px-4 py-3 sm:hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{user.displayName || user.username || 'User'}</p>
                    <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider truncate">{roleMap[user.role] || user.role}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/analytics"
                      onClick={() => setIsSettingsOpen(false)}
                      className="w-full text-left group flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <BarChart3 className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-500" />
                      Phân tích & Thống kê
                    </Link>
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full text-left group flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <Settings className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-500" />
                      Đổi thông tin cá nhân
                    </button>
                  </div>
                  {user.role === 'ADMIN' && (
                    <div className="py-1 border-t border-gray-100">
                      <Link
                        to="/users"
                        className="group flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        onClick={() => setIsSettingsOpen(false)}
                      >
                        <Users className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-500" />
                        Quản lý người dùng
                      </Link>
                      <Link
                        to="/backup"
                        className="group flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        onClick={() => setIsSettingsOpen(false)}
                      >
                        <Database className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-500" />
                        Dữ liệu
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={signOut}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-600 p-2 rounded-full transition-colors focus:outline-none"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-8 overflow-y-auto sm:overflow-hidden relative">
        <Outlet />
      </main>

      <footer className="px-4 sm:px-8 py-3 bg-white/20 backdrop-blur-sm flex flex-col sm:flex-row justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest gap-2">
        <div>© 2024 Design Team Internal Tool</div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đồng bộ hóa tức thì</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="hidden sm:inline">Version 1.0.2 - PWA Enabled</span>
        </div>
      </footer>

      {isCreateModalOpen && (
        <CreateTaskModal onClose={() => setIsCreateModalOpen(false)} />
      )}
      
      {isProfileModalOpen && (
        <UserProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}
    </div>
  );
};
