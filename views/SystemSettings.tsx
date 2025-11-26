

import React, { useState, useEffect, useRef } from 'react';
import { SystemConfig, User } from '../types';
import { dataService, authService } from '../services/storage';

interface SystemSettingsProps {
  currentUser: User;
  showToast: (msg: string, type: 'success' | 'error') => void;
  onConfigUpdate: () => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ currentUser, showToast, onConfigUpdate }) => {
  const [config, setConfig] = useState<SystemConfig>({
      siteName: '',
      siteDescription: '',
      contactEmail: '',
      footerText: '',
      logoUrl: '',
      faviconUrl: '',
      allowRegistration: true
  });
  const [loading, setLoading] = useState(false);

  // File Upload State
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  
  // Refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadConfig = async () => {
        setLoading(true);
        try {
            const currentConfig = await dataService.getSystemConfig();
            setConfig(currentConfig);
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    loadConfig();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 2 * 1024 * 1024) { // 2MB limit
              showToast('Kích thước ảnh không được vượt quá 2MB', 'error');
              return;
          }

          const previewUrl = URL.createObjectURL(file);

          if (type === 'logo') {
              setLogoFile(file);
              setConfig(prev => ({ ...prev, logoUrl: previewUrl }));
          } else {
              setFaviconFile(file);
              setConfig(prev => ({ ...prev, faviconUrl: previewUrl }));
          }
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!config.siteName.trim()) {
          showToast('Tên hệ thống không được để trống', 'error');
          return;
      }
      
      setLoading(true);
      try {
          let finalLogoUrl = config.logoUrl;
          let finalFaviconUrl = config.faviconUrl;

          // Upload Logo if new file selected
          if (logoFile) {
             finalLogoUrl = await authService.uploadSystemAsset(logoFile);
          }

          // Upload Favicon if new file selected
          if (faviconFile) {
             finalFaviconUrl = await authService.uploadSystemAsset(faviconFile);
          }

          const configToSave = {
              ...config,
              logoUrl: finalLogoUrl,
              faviconUrl: finalFaviconUrl
          };

          await dataService.saveSystemConfig(configToSave);
          
          // Reset file states
          setLogoFile(null);
          setFaviconFile(null);
          
          showToast('Cập nhật cấu hình thành công', 'success');
          onConfigUpdate(); // Notify App to reload config
      } catch (err: any) {
          showToast(err.message || 'Có lỗi xảy ra khi lưu', 'error');
      } finally {
          setLoading(false);
      }
  };

  if (loading && !config.siteName) return <div className="text-center py-20">Đang tải cấu hình...</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Cấu hình Hệ thống</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Thay đổi thông tin hiển thị chung và nhận diện thương hiệu của website.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
            {/* General Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-xl">⚙️</span> Thông tin chung
                    </h3>
                </div>
                
                <div className="p-8 space-y-6">
                    {/* Allow Registration Toggle */}
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <div>
                            <span className="block text-sm font-bold text-gray-900 dark:text-white">Cho phép đăng ký thành viên</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Nếu tắt, chỉ Admin mới có thể tạo tài khoản từ trang quản lý.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={config.allowRegistration ?? true}
                                onChange={(e) => setConfig(prev => ({...prev, allowRegistration: e.target.checked}))}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Tên hệ thống (Site Name) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={config.siteName}
                                onChange={(e) => setConfig(prev => ({...prev, siteName: e.target.value}))}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ví dụ: ResourceVault VN"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hiển thị trên thanh tiêu đề, menu và trang đăng nhập.</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Mô tả hệ thống
                            </label>
                            <textarea
                                value={config.siteDescription}
                                onChange={(e) => setConfig(prev => ({...prev, siteDescription: e.target.value}))}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-24 resize-none"
                                placeholder="Mô tả ngắn gọn về hệ thống..."
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hiển thị trên trang đăng nhập.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Email liên hệ
                            </label>
                            <input
                                type="email"
                                value={config.contactEmail}
                                onChange={(e) => setConfig(prev => ({...prev, contactEmail: e.target.value}))}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="support@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Văn bản chân trang (Footer)
                            </label>
                            <input
                                type="text"
                                value={config.footerText}
                                onChange={(e) => setConfig(prev => ({...prev, footerText: e.target.value}))}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="© 2024 Your Company"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Branding Settings (Redesigned for Upload) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-xl">🎨</span> Nhận diện thương hiệu
                    </h3>
                </div>
                
                <div className="p-8 space-y-8">
                     {/* Logo Upload */}
                     <div className="flex flex-col md:flex-row gap-6">
                         <div className="w-full md:w-1/3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Logo hệ thống</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Logo chính hiển thị trên thanh Menu và trang Đăng nhập.</p>
                         </div>
                         <div className="w-full md:w-2/3 flex items-start gap-4">
                             <div 
                                onClick={() => logoInputRef.current?.click()}
                                className="w-full h-32 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer flex flex-col items-center justify-center p-4 transition group relative overflow-hidden"
                             >
                                 {config.logoUrl ? (
                                     <img src={config.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                                 ) : (
                                     <div className="flex flex-col items-center text-gray-400 group-hover:text-blue-500">
                                         <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                         <span className="text-sm font-medium">Tải ảnh lên</span>
                                     </div>
                                 )}
                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                     <span className="text-white font-medium text-sm bg-black/50 px-3 py-1 rounded-full">Thay đổi</span>
                                 </div>
                             </div>
                             <input 
                                type="file" 
                                ref={logoInputRef}
                                onChange={(e) => handleFileSelect(e, 'logo')}
                                accept="image/*"
                                className="hidden"
                             />
                         </div>
                     </div>

                     <div className="border-t border-gray-100 dark:border-gray-700"></div>

                     {/* Favicon Upload */}
                     <div className="flex flex-col md:flex-row gap-6">
                         <div className="w-full md:w-1/3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Favicon (Icon trình duyệt)</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Icon nhỏ hiển thị trên tab trình duyệt. Nên dùng ảnh vuông (tỉ lệ 1:1).</p>
                         </div>
                         <div className="w-full md:w-2/3 flex items-start gap-4">
                             <div 
                                onClick={() => faviconInputRef.current?.click()}
                                className="w-24 h-24 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer flex flex-col items-center justify-center p-2 transition group relative overflow-hidden"
                             >
                                 {config.faviconUrl ? (
                                     <img src={config.faviconUrl} alt="Favicon" className="w-10 h-10 object-contain" />
                                 ) : (
                                     <span className="text-xs text-gray-400 group-hover:text-blue-500">Upload</span>
                                 )}
                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                     <span className="text-white font-bold text-xs">Sửa</span>
                                 </div>
                             </div>
                             <div className="flex-1 flex flex-col justify-center text-sm text-gray-500 dark:text-gray-400">
                                 <p>Nhấp vào khung để chọn ảnh mới.</p>
                                 <p>Định dạng hỗ trợ: PNG, JPG, ICO, SVG.</p>
                             </div>
                             <input 
                                type="file" 
                                ref={faviconInputRef}
                                onChange={(e) => handleFileSelect(e, 'favicon')}
                                accept="image/*"
                                className="hidden"
                             />
                         </div>
                     </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 pb-8">
                 <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition transform active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                     {loading ? (
                         <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     ) : (
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                     )}
                     Lưu tất cả cấu hình
                 </button>
             </div>
        </form>
    </div>
  );
};