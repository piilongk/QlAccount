
import React, { useState } from 'react';
import { authService } from '../services/storage';
import { SystemConfig } from '../types';

interface AuthProps {
  onLoginSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  systemConfig: SystemConfig;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess, showToast, systemConfig }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form States
  const [username, setUsername] = useState(''); // Used as identifier (username or email) in login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic Validation
    if (isLogin) {
        if (!username.trim() || !password.trim()) {
            setError('Vui lòng nhập đầy đủ thông tin');
            return;
        }
    } else {
        if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            setError('Vui lòng nhập đầy đủ các trường');
            return;
        }
        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }
        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Login supports username OR email
        const user = await authService.login(username, password);
        if (!user) {
          setError('Tên đăng nhập/Email hoặc mật khẩu không đúng.');
          setIsLoading(false);
          return;
        }
      } else {
        // Register always creates 'user' role
        await authService.register(username, email, password, 'user', fullName);
        showToast('Đăng ký thành công! Đang đăng nhập...', 'success');
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const allowRegistration = systemConfig.allowRegistration !== false;

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900 transition-colors duration-300 font-sans">
      {/* Left Side - Visual (Professional Enterprise Design) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0B0F19] items-center justify-center overflow-hidden">
        
        {/* Technical Grid Background */}
        <div className="absolute inset-0 z-0 opacity-20" 
             style={{ 
                 backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(to right, #4f46e5 1px, transparent 1px)', 
                 backgroundSize: '40px 40px' 
             }}>
        </div>
        
        {/* Radial Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-[#0B0F19]/80 z-0 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
            
            {/* Logo & Branding Area */}
            <div className="mb-12 text-center animate-fade-in">
                 {systemConfig.logoUrl ? (
                    <img src={systemConfig.logoUrl} alt="Logo" className="h-20 w-auto mb-6 object-contain mx-auto drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-500/30 mx-auto mb-6">
                        {systemConfig.siteName.charAt(0).toUpperCase()}
                    </div>
                )}
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-200 tracking-tight mb-3">
                    {systemConfig.siteName}
                </h1>
                <p className="text-base text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">
                    {systemConfig.siteDescription || 'Nền tảng quản trị tài nguyên doanh nghiệp tập trung.'}
                </p>
            </div>

            {/* Main Visual: Layered Glass Cards */}
            <div className="relative w-full aspect-square max-h-[400px]">
                
                {/* Back Layer - Data Structure */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl transform -rotate-6 scale-90 opacity-60 transition-all duration-1000 ease-in-out hover:-rotate-3 hover:scale-95"></div>

                {/* Middle Layer - Connection */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4/5 h-64 bg-slate-800/60 backdrop-blur-md border border-slate-600/50 rounded-2xl transform rotate-3 scale-95 opacity-80 shadow-2xl transition-all duration-1000 ease-in-out hover:rotate-1 hover:scale-100 flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-4 opacity-30 w-full px-8">
                        <div className="h-2 bg-slate-400 rounded w-full"></div><div className="h-2 bg-slate-400 rounded w-2/3"></div>
                        <div className="h-2 bg-slate-400 rounded w-3/4"></div><div className="h-2 bg-slate-400 rounded w-full"></div>
                        <div className="h-2 bg-slate-400 rounded w-1/2"></div><div className="h-2 bg-slate-400 rounded w-3/4"></div>
                    </div>
                </div>

                {/* Front Layer - Main Dashboard Interface */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-sm bg-[#1e293b]/80 backdrop-blur-xl border border-slate-500/30 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden transform transition-transform duration-500 hover:translate-y-[-5px]">
                    {/* Fake Header */}
                    <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <div className="flex space-x-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                        </div>
                        <div className="h-2 w-20 bg-white/10 rounded-full"></div>
                    </div>

                    {/* Fake Body */}
                    <div className="p-6 space-y-6">
                        {/* Stat Row */}
                        <div className="flex gap-4">
                            <div className="flex-1 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-3 rounded-xl">
                                <div className="h-1.5 w-12 bg-blue-400/30 rounded mb-2"></div>
                                <div className="h-6 w-16 bg-blue-500/80 rounded mb-1"></div>
                            </div>
                            <div className="flex-1 bg-white/5 border border-white/5 p-3 rounded-xl">
                                <div className="h-1.5 w-12 bg-slate-500/30 rounded mb-2"></div>
                                <div className="h-6 w-10 bg-slate-600/50 rounded mb-1"></div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="space-y-2">
                             <div className="flex justify-between items-end h-24 gap-2 px-2">
                                 <div className="w-full bg-indigo-500/20 rounded-t-sm h-[40%] relative group">
                                     <div className="absolute inset-x-0 bottom-0 bg-indigo-500 h-0 transition-all duration-1000 group-hover:h-full opacity-50"></div>
                                 </div>
                                 <div className="w-full bg-indigo-500/20 rounded-t-sm h-[70%]"></div>
                                 <div className="w-full bg-indigo-500/40 rounded-t-sm h-[50%]"></div>
                                 <div className="w-full bg-blue-500 rounded-t-sm h-[85%] shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
                                 <div className="w-full bg-indigo-500/20 rounded-t-sm h-[60%]"></div>
                             </div>
                             <div className="h-1 w-full bg-white/5 rounded-full"></div>
                        </div>

                        {/* List Items */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</div>
                                <div className="space-y-1">
                                    <div className="h-2 w-24 bg-white/20 rounded"></div>
                                    <div className="h-1.5 w-16 bg-white/10 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Badges */}
                <div className="absolute top-[20%] right-0 bg-slate-800/90 backdrop-blur border border-slate-600/50 px-4 py-2 rounded-lg shadow-xl flex items-center gap-3 animate-pulse" style={{ animationDuration: '4s' }}>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-medium text-slate-300">System Online</span>
                </div>

                <div className="absolute bottom-[20%] -left-4 bg-blue-900/80 backdrop-blur border border-blue-500/30 px-4 py-2 rounded-lg shadow-xl flex items-center gap-3 transform hover:scale-105 transition-transform">
                    <span className="text-xs font-bold text-blue-200">New Resource Added</span>
                </div>
            </div>

            {/* Footer Features */}
            <div className="mt-16 w-full flex justify-between px-8 border-t border-white/5 pt-6">
                <div className="text-center">
                    <div className="text-white font-bold text-lg">99.9%</div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mt-1">Uptime</div>
                </div>
                <div className="text-center">
                    <div className="text-white font-bold text-lg">24/7</div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mt-1">Support</div>
                </div>
                <div className="text-center">
                    <div className="text-white font-bold text-lg">∞</div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mt-1">Scalable</div>
                </div>
            </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-[420px] w-full bg-white dark:bg-gray-800 p-8 md:p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-none border border-gray-100 dark:border-gray-700 transition-all">
          <div className="text-left mb-8">
            
            {/* Mobile Logo & Branding (Enhanced) */}
            <div className="lg:hidden mb-8 flex items-center gap-3">
                {systemConfig.logoUrl ? (
                    <img src={systemConfig.logoUrl} alt="Logo" className="h-10 w-auto object-contain drop-shadow-md" />
                ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                        {systemConfig.siteName.charAt(0).toUpperCase()}
                    </div>
                )}
                <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{systemConfig.siteName}</span>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {isLogin ? 'Nhập thông tin xác thực để truy cập dashboard.' : 'Điền thông tin bên dưới để bắt đầu quản lý dự án.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Registration Only: Full Name */}
            {!isLogin && (
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Họ và tên</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                        placeholder="Nguyễn Văn A"
                        disabled={isLoading}
                    />
                </div>
            )}

            {/* Username / Identifier */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {isLogin ? 'Email hoặc Tên đăng nhập' : 'Tên đăng nhập'}
              </label>
              <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  placeholder={isLogin ? "user@example.com" : "username"}
                  disabled={isLoading}
                />
            </div>

            {/* Email - Only for Registration */}
            {!isLogin && (
                <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                    placeholder="user@example.com"
                    disabled={isLoading}
                    />
                </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mật khẩu</label>
              <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
            </div>

             {/* Confirm Password - Only for Registration */}
             {!isLogin && (
                <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Xác nhận mật khẩu</label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                    placeholder="••••••••"
                    disabled={isLoading}
                    />
                </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 text-sm rounded-r-lg flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center mt-2"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                isLogin ? 'Đăng nhập hệ thống' : 'Đăng ký tài khoản'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
            {allowRegistration ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isLogin ? 'Bạn chưa có tài khoản?' : 'Bạn đã có tài khoản?'}
                    <button
                        onClick={() => { setIsLogin(!isLogin); resetForm(); }}
                        className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold hover:underline transition"
                    >
                        {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </button>
                </p>
            ) : (
                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Thông báo hệ thống</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 italic bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-full">Chức năng đăng ký thành viên mới đang tạm khóa.</span>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
