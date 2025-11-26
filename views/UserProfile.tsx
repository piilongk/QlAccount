
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { authService } from '../services/storage';

interface UserProfileProps {
  currentUser: User;
  showToast: (msg: string, type: 'success' | 'error') => void;
  onProfileUpdate: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ currentUser, showToast, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
  const [loading, setLoading] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  
  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
      setFullName(currentUser.fullName || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setAvatarFile(null);
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          // Check file size (e.g. 2MB)
          if (file.size > 2 * 1024 * 1024) {
              showToast('Kích thước ảnh không được vượt quá 2MB', 'error');
              return;
          }
          // Check type
          if (!file.type.startsWith('image/')) {
              showToast('Vui lòng chọn file ảnh', 'error');
              return;
          }

          setAvatarFile(file);
          // Create preview URL
          setAvatarUrl(URL.createObjectURL(file));
      }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        let finalAvatarUrl = avatarUrl;

        // If a new file was selected, upload it first
        if (avatarFile) {
            try {
                finalAvatarUrl = await authService.uploadAvatar(currentUser.id, avatarFile);
            } catch (uploadErr: any) {
                showToast('Lỗi upload ảnh: ' + uploadErr.message, 'error');
                setLoading(false);
                return;
            }
        }

        await authService.updateProfile(currentUser.id, {
            fullName,
            avatarUrl: finalAvatarUrl
        });
        showToast('Cập nhật thông tin thành công!', 'success');
        onProfileUpdate();
    } catch (err: any) {
        showToast(err.message || 'Lỗi cập nhật hồ sơ', 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          showToast('Mật khẩu mới không khớp!', 'error');
          return;
      }
      if (newPassword.length < 6) {
          showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
          return;
      }

      setLoading(true);
      try {
          await authService.changePassword(currentUser.email, oldPassword, newPassword);
          showToast('Đổi mật khẩu thành công!', 'success');
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
      } catch (err: any) {
          showToast(err.message || 'Lỗi đổi mật khẩu', 'error');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Hồ sơ cá nhân</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý thông tin tài khoản và bảo mật.</p>
        </div>

        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
                onClick={() => setActiveTab('general')}
                className={`pb-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'general' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                Thông tin chung
                {activeTab === 'general' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>}
            </button>
            <button
                onClick={() => setActiveTab('security')}
                className={`pb-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'security' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                Bảo mật & Mật khẩu
                {activeTab === 'security' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>}
            </button>
        </div>

        {activeTab === 'general' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <form onSubmit={handleUpdateProfile} className="p-6 md:p-8 space-y-6">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex flex-col items-center space-y-3 group w-full md:w-auto">
                             <div 
                                className="w-32 h-32 rounded-full bg-gray-100 dark:bg-gray-700 border-4 border-white dark:border-gray-600 shadow-lg overflow-hidden flex items-center justify-center relative cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                             >
                                 {avatarUrl ? (
                                     <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition duration-300 group-hover:brightness-50" />
                                 ) : (
                                     <span className="text-5xl group-hover:opacity-50 transition">👤</span>
                                 )}
                                 
                                 {/* Overlay Icon */}
                                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                     <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                     </svg>
                                 </div>
                             </div>
                             <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                             >
                                 Thay đổi ảnh
                             </button>
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                             />
                        </div>
                        
                        <div className="flex-1 w-full space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tên đăng nhập</label>
                                    <input
                                        type="text"
                                        value={currentUser.username}
                                        disabled
                                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                    <input
                                        type="text"
                                        value={currentUser.email}
                                        disabled
                                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Họ và tên</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white"
                                    placeholder="Nhập họ tên đầy đủ"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading && <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            Lưu thông tin
                        </button>
                    </div>
                </form>
            </div>
        ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <form onSubmit={handleChangePassword} className="p-6 md:p-8 space-y-6 max-w-lg">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mật khẩu hiện tại</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white"
                            placeholder="••••••••"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mật khẩu mới</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Xác nhận mật khẩu mới</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                             {loading && <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            Đổi mật khẩu
                        </button>
                    </div>
                </form>
            </div>
        )}
    </div>
  );
};
