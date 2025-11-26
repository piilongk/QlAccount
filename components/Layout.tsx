
import React, { useState } from 'react';
import { User, PERMISSIONS, SystemConfig } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  systemConfig: SystemConfig;
}

interface NavItemProps {
  item: { id: string; label: string; icon: any };
  isMobile?: boolean;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, isMobile = false, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden active:scale-95 ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-900/20'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-blue-600 dark:hover:text-blue-400'
      }`}
    >
      <span className={`relative z-10 transition-transform duration-300 flex-shrink-0 ${isActive ? 'text-white scale-110' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:scale-110'}`}>
        {item.icon}
      </span>
      <span className="font-semibold text-sm relative z-10">{item.label}</span>
      
      {/* Active Indicator Glow */}
      {isActive && !isMobile && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-100 z-0"></div>
      )}
    </button>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentPage, onNavigate, isDarkMode, toggleTheme, systemConfig }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    )},
    { id: 'projects', label: 'Dự án', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    )},
    { id: 'data', label: 'Dữ liệu', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    )},
  ];

  if (PERMISSIONS.canManageSchema(user)) {
    menuItems.push({ id: 'schema', label: 'Cấu trúc dữ liệu', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )});
  }

  if (user.role === 'admin') {
      menuItems.push({ id: 'users', label: 'Thành viên', icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      )});
      
      // Add Activity Log
      menuItems.push({ id: 'activity', label: 'Nhật ký hoạt động', icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )});

      menuItems.push({ id: 'settings', label: 'Cấu hình', icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      )});
  }

  const roleColors = {
      admin: 'bg-amber-400',
      manager: 'bg-purple-400',
      user: 'bg-emerald-400'
  };

  const roleLabels = {
      admin: 'Admin',
      manager: 'Quản lý',
      user: 'Nhân viên'
  };

  const renderAvatar = () => {
    if (user.avatarUrl) {
        return <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-md" />;
    }
    return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white dark:border-slate-700">
            {user.username[0].toUpperCase()}
        </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 transition-colors duration-500 font-sans">
      {/* Sidebar Desktop */}
      <aside className="w-[280px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-800/60 flex-col fixed h-full z-30 hidden md:flex transition-all duration-300">
        
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-800/50">
             {systemConfig.logoUrl ? (
                <img src={systemConfig.logoUrl} alt="Logo" className="h-8 w-auto object-contain mr-3" />
            ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg mr-3 shadow-lg shadow-blue-500/30">
                    {systemConfig.siteName.charAt(0).toUpperCase()}
                </div>
            )}
            <div>
                <h1 className="text-base font-bold text-slate-800 dark:text-white leading-tight truncate max-w-[160px]">{systemConfig.siteName}</h1>
                <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Workspace</p>
            </div>
        </div>
        
        {/* Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => (
            <NavItem 
              key={item.id} 
              item={item} 
              isActive={currentPage === item.id}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
            {/* User Profile Card */}
            <div 
                onClick={() => onNavigate('profile')}
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer transition-all duration-200 group"
            >
                {renderAvatar()}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {user.fullName || user.username}
                    </p>
                    <div className="flex items-center mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${roleColors[user.role]}`}></span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{roleLabels[user.role]}</p>
                    </div>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={toggleTheme}
                    className="flex-1 flex items-center justify-center p-2.5 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
                    title="Chuyển chế độ Sáng/Tối"
                >
                    {isDarkMode ? '🌙' : '☀️'}
                </button>
                <button
                    onClick={onLogout}
                    className="flex-1 flex items-center justify-center space-x-2 p-2.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-900/30 transition active:scale-95"
                    title="Đăng xuất"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
            </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 px-4 h-16 flex justify-between items-center transition-colors">
         <div className="flex items-center space-x-3">
            {systemConfig.logoUrl ? (
                <img src={systemConfig.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {systemConfig.siteName.charAt(0).toUpperCase()}
                </div>
            )}
            <span className="font-bold text-slate-800 dark:text-white truncate max-w-[150px]">{systemConfig.siteName}</span>
         </div>
         <div className="flex items-center gap-2">
             <button onClick={toggleTheme} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 active:scale-95">
                 {isDarkMode ? '🌙' : '☀️'}
             </button>
             <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 active:scale-95"
             >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
             </button>
         </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm md:hidden animate-fade-in" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute right-0 top-16 w-[85%] max-w-xs bg-white dark:bg-slate-900 h-[calc(100vh-4rem)] shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-in-right" onClick={e => e.stopPropagation()}>
                <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <NavItem 
                          key={item.id} 
                          item={item} 
                          isMobile={true} 
                          isActive={currentPage === item.id}
                          onClick={() => {
                            onNavigate(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                        />
                    ))}
                    <div className="my-4 border-t border-slate-100 dark:border-slate-800"></div>
                     <NavItem 
                        item={{ id: 'profile', label: 'Hồ sơ cá nhân', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> }}
                        isMobile={true}
                        isActive={currentPage === 'profile'}
                        onClick={() => {
                            onNavigate('profile');
                            setIsMobileMenuOpen(false);
                        }}
                    />
                </nav>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center mb-4">
                        <div className="mr-3">
                             {renderAvatar()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{user.fullName || user.username}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{roleLabels[user.role]}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition active:scale-95">Đăng xuất</button>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center mt-4">{systemConfig.footerText}</p>
                </div>
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[280px] min-h-screen flex flex-col relative overflow-hidden">
        {/* Top Gradient decoration (optional) */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 pointer-events-none z-0"></div>
        
        {/* Content wrapper with responsive padding - Adjusted for mobile */}
        <div className="flex-1 p-4 md:p-8 mt-16 md:mt-0 relative z-10 overflow-y-auto overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-6">
                {children}
            </div>
        </div>
      </main>
    </div>
  );
};