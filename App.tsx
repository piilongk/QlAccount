

import React, { useState, useEffect } from 'react';
import { Auth } from './views/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { SchemaBuilder } from './views/SchemaBuilder';
import { DataManager } from './views/DataManager';
import { UserManager } from './views/UserManager';
import { SystemSettings } from './views/SystemSettings';
import { ProjectManager } from './views/ProjectManager';
import { UserProfile } from './views/UserProfile';
import { ActivityLogs } from './views/ActivityLogs';
import { authService, dataService } from './services/storage';
import { User, SystemConfig } from './types';

// Simple Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-[60] px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 flex items-center gap-2 animate-fade-in ${
      type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
    }`}>
      <span>{type === 'success' ? '✅' : '⚠️'}</span>
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 opacity-80 hover:opacity-100 font-bold">&times;</button>
    </div>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
      siteName: 'ResourceVault VN',
      siteDescription: '',
      contactEmail: '',
      footerText: ''
  });

  // Initialize Auth, Theme, and Config
  useEffect(() => {
    const init = async () => {
        try {
            await loadUser();

            // Check LocalStorage for theme preference (Keep local)
            const storedTheme = localStorage.getItem('theme');
            if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                setIsDarkMode(true);
                document.documentElement.classList.add('dark');
            } else {
                setIsDarkMode(false);
                document.documentElement.classList.remove('dark');
            }

            await loadSystemConfig();
        } catch (e) {
            console.error("Initialization error", e);
        } finally {
            setIsLoading(false);
        }
    };
    init();
  }, []);

  const loadUser = async () => {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
          setUser(currentUser);
      }
  };

  const loadSystemConfig = async () => {
      try {
        const config = await dataService.getSystemConfig();
        setSystemConfig(config);
        document.title = config.siteName;
        
        // Update Favicon
        if (config.faviconUrl) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = config.faviconUrl;
        }
      } catch (e) {
          console.error("Failed to load config", e);
      }
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newMode;
    });
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleLoginSuccess = async () => {
    await loadUser();
    setCurrentPage('dashboard');
    showToast(`Chào mừng trở lại!`);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setToast(null);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'schema':
        return user?.role === 'admin' 
          ? <SchemaBuilder showToast={showToast} /> 
          : <div className="flex h-full items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl m-4">Bạn không có quyền truy cập trang này.</div>;
      case 'users':
        return user?.role === 'admin'
          ? <UserManager currentUser={user} showToast={showToast} />
          : <div className="flex h-full items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl m-4">Bạn không có quyền truy cập trang này.</div>;
      case 'activity':
        return user?.role === 'admin'
          ? <ActivityLogs />
          : <div className="flex h-full items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl m-4">Bạn không có quyền truy cập trang này.</div>;
      case 'settings':
        return user?.role === 'admin'
            ? <SystemSettings currentUser={user} showToast={showToast} onConfigUpdate={loadSystemConfig} />
            : <div className="flex h-full items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl m-4">Bạn không có quyền truy cập trang này.</div>;
      case 'data':
        return user ? <DataManager currentUser={user} showToast={showToast} /> : null;
      case 'projects':
        return <ProjectManager currentUser={user} showToast={showToast} />;
      case 'profile':
        return user ? <UserProfile currentUser={user} showToast={showToast} onProfileUpdate={loadUser} /> : null;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
  }

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} showToast={showToast} systemConfig={systemConfig} />;
  }

  return (
    <>
      <Layout 
        user={user} 
        onLogout={handleLogout} 
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        systemConfig={systemConfig}
      >
        {renderContent()}
      </Layout>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </>
  );
}

export default App;