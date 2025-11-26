import React, { useState, useEffect, useRef } from 'react';
import { Category, FieldDefinition, FieldType } from '../types';
import { dataService, generateUUID } from '../services/storage';
import { supabase } from '../services/supabase';

interface SchemaBuilderProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const PRESET_ICONS = [
    '📁', '📂', '📄', '📊', '📈', '📉', 
    '👥', '👤', '💼', '📛', '🎓', '🏥',
    '💰', '💳', '💵', '💎', '🏦', '⚖️',
    '📦', '🚚', '🛒', '🏭', '🏗️', '🔨',
    '📅', '🕒', '✅', '⚠️', '🔒', '🔑',
    '🖥️', '📱', '📧', '🌐', '🚀', '💡'
];

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({ showToast }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({
    name: '',
    description: '',
    fields: [],
    accessLevel: 'public',
    icon: '📁' // Default icon
  });
  const [loading, setLoading] = useState(false);
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Delete Modal State
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  // Icon Picker State
  const [showIconPicker, setShowIconPicker] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategories();
    
    const channel = supabase.channel('realtime_categories')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
            loadCategories();
        })
        .subscribe();

    // Click outside to close icon picker
    const handleClickOutside = (event: MouseEvent) => {
        if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
            setShowIconPicker(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        supabase.removeChannel(channel);
    };
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
        const cats = await dataService.getCategories();
        setCategories(cats);
    } catch(e) {
        showToast('Lỗi tải cấu trúc', 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleAddField = () => {
    const newField: FieldDefinition = {
      id: generateUUID(),
      name: '',
      key: `field_${Date.now()}`,
      type: 'text',
      required: false
    };
    setCurrentCategory(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }));
  };

  const handleUpdateField = (id: string, updates: Partial<FieldDefinition>) => {
    setCurrentCategory(prev => ({
      ...prev,
      fields: prev.fields?.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const handleRemoveField = (id: string) => {
    setCurrentCategory(prev => ({
      ...prev,
      fields: prev.fields?.filter(f => f.id !== id)
    }));
  };

  const handleSaveCategory = async () => {
    if (!currentCategory.name?.trim()) {
        showToast('Vui lòng nhập tên danh mục', 'error');
        return;
    }

    if (!currentCategory.fields || currentCategory.fields.length === 0) {
        showToast('Vui lòng thêm ít nhất một trường dữ liệu', 'error');
        return;
    }

    const emptyFieldName = currentCategory.fields.some(f => !f.name.trim());
    if (emptyFieldName) {
        showToast('Tên trường dữ liệu không được để trống', 'error');
        return;
    }
    
    const categoryToSave: Category = {
      id: currentCategory.id || generateUUID(),
      name: currentCategory.name,
      description: currentCategory.description || '',
      fields: currentCategory.fields || [],
      createdAt: currentCategory.createdAt || Date.now(),
      accessLevel: currentCategory.accessLevel || 'public',
      icon: currentCategory.icon || '📁'
    };
    
    try {
        await dataService.saveCategory(categoryToSave);
        setIsEditing(false);
        setCurrentCategory({ name: '', description: '', fields: [], accessLevel: 'public', icon: '📁' });
        showToast('Lưu cấu trúc thành công!', 'success');
        // loadCategories handled by realtime
    } catch(e) {
        showToast('Lỗi lưu cấu trúc', 'error');
    }
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = async () => {
      if (categoryToDelete) {
          try {
            await dataService.deleteCategory(categoryToDelete.id);
            showToast('Đã xóa danh mục', 'success');
            setCategoryToDelete(null);
            // loadCategories handled by realtime
          } catch(e) {
              showToast('Lỗi xóa danh mục', 'error');
          }
      }
  };

  const handleEditCategory = (cat: Category) => {
    setCurrentCategory(JSON.parse(JSON.stringify(cat)));
    setIsEditing(true);
  };

  const getTypeIcon = (type: FieldType) => {
    switch (type) {
        case 'text': return 'Aa';
        case 'number': return '#';
        case 'date': return '📅';
        case 'boolean': return '☑️';
        case 'textarea': return '¶';
        case 'project': return '🏗️';
        case 'user': return '👤';
        case 'image': return '🖼️';
        case 'file': return '📎';
        default: return '?';
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up pb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 dark:border-gray-700 pb-4 gap-4">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{currentCategory.id ? 'Chỉnh sửa Cấu Trúc' : 'Tạo Cấu Trúc Mới'}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Định nghĩa các trường thông tin cho loại dữ liệu này.</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition text-center">
                    Hủy bỏ
                </button>
                <button onClick={handleSaveCategory} className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg font-medium transition flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Lưu
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Basic Info */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">1</span>
                        Thông tin chung
                    </h3>
                    <div className="space-y-4">
                        {/* Icon Picker */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Biểu tượng</label>
                            <div className="relative" ref={iconPickerRef}>
                                <button 
                                    onClick={() => setShowIconPicker(!showIconPicker)}
                                    className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 flex items-center justify-center text-4xl bg-gray-50 dark:bg-gray-700 transition"
                                >
                                    {currentCategory.icon || '📁'}
                                </button>
                                {showIconPicker && (
                                    <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-72 grid grid-cols-6 gap-2">
                                        {PRESET_ICONS.map(icon => (
                                            <button
                                                key={icon}
                                                onClick={() => {
                                                    setCurrentCategory(prev => ({...prev, icon}));
                                                    setShowIconPicker(false);
                                                }}
                                                className={`w-10 h-10 flex items-center justify-center text-2xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition ${currentCategory.icon === icon ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500' : ''}`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên Danh Mục <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={currentCategory.name}
                            onChange={(e) => setCurrentCategory(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Ví dụ: Hồ sơ nhân sự"
                        />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quyền truy cập</label>
                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                <button
                                    onClick={() => setCurrentCategory(prev => ({...prev, accessLevel: 'public'}))}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${currentCategory.accessLevel === 'public' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                >
                                    Công khai
                                </button>
                                <button
                                    onClick={() => setCurrentCategory(prev => ({...prev, accessLevel: 'restricted'}))}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${currentCategory.accessLevel === 'restricted' ? 'bg-white dark:bg-gray-600 shadow-sm text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                >
                                    Hạn chế
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {currentCategory.accessLevel === 'public' 
                                    ? 'Mọi nhân viên đều có thể xem dữ liệu này.' 
                                    : 'Chỉ Admin và Quản lý mới có thể xem dữ liệu này.'}
                            </p>
                        </div>
                        <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mô tả</label>
                        <textarea
                            value={currentCategory.description}
                            onChange={(e) => setCurrentCategory(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition h-32 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Mô tả ngắn gọn về loại dữ liệu này..."
                        />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Fields */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">2</span>
                            Các trường dữ liệu
                        </h3>
                        <button onClick={handleAddField} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium shadow-sm transition">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Thêm trường
                        </button>
                    </div>

                    <div className="space-y-3">
                        {currentCategory.fields?.length === 0 && (
                            <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700/50">
                                <span className="text-4xl block mb-2">📋</span>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Chưa có trường dữ liệu nào</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Nhấn "Thêm trường" để bắt đầu định nghĩa cấu trúc</p>
                            </div>
                        )}
                        {currentCategory.fields?.map((field, index) => (
                        <div key={field.id} className="group flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm items-start md:items-center hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                            <div className="flex items-center justify-between w-full md:w-auto md:justify-center">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 font-bold text-xs shrink-0 cursor-move">
                                    {index + 1}
                                </div>
                                {/* Mobile delete button */}
                                <button
                                    onClick={() => handleRemoveField(field.id)}
                                    className="md:hidden p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                            
                            <div className="flex-1 w-full space-y-1">
                                <label className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Tên hiển thị</label>
                                <input
                                    type="text"
                                    value={field.name}
                                    onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                                    className="w-full border-b border-gray-300 dark:border-gray-500 py-1 text-sm font-medium focus:border-blue-500 outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                                    placeholder="Nhập tên trường..."
                                />
                            </div>

                            <div className="w-full md:w-40 space-y-1">
                                <label className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Kiểu dữ liệu</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 dark:text-gray-400">{getTypeIcon(field.type)}</span>
                                    <select
                                        value={field.type}
                                        onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FieldType })}
                                        className="w-full border border-gray-200 dark:border-gray-500 rounded-lg py-1.5 pl-7 pr-2 text-sm bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="text">Văn bản ngắn</option>
                                        <option value="textarea">Văn bản dài</option>
                                        <option value="number">Số</option>
                                        <option value="date">Ngày tháng</option>
                                        <option value="boolean">Đúng/Sai</option>
                                        <option value="project">Liên kết Dự án</option>
                                        <option value="user">Liên kết Người dùng</option>
                                        <option value="image">Hình ảnh</option>
                                        <option value="file">Tệp đính kèm</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center pt-2 md:pt-0">
                                <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${field.required ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600'}`}>
                                        {field.required && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={field.required}
                                        onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                        className="hidden"
                                    />
                                    <span>Bắt buộc</span>
                                </label>
                            </div>

                            {/* Desktop delete button */}
                            <button
                            onClick={() => handleRemoveField(field.id)}
                            className="hidden md:block p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition md:ml-2"
                            title="Xóa trường này"
                            >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Cấu Trúc Dữ Liệu</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Quản lý các mô hình dữ liệu (schemas) của hệ thống.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* View Toggle */}
            <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center shadow-sm">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    title="Dạng Lưới"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    title="Danh sách"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            </div>

            <button
            onClick={() => { setCurrentCategory({ name: '', description: '', fields: [], accessLevel: 'public', icon: '📁' }); setIsEditing(true); }}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 font-medium transition active:scale-95 whitespace-nowrap"
            >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Tạo Schema mới
            </button>
        </div>
      </div>

      {loading ? (
          <div className="text-center py-20 text-gray-500">Đang tải danh mục...</div>
      ) : (
          <>
            {/* GRID VIEW */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((cat) => (
                    <div key={cat.id} className="group bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl">
                                {cat.icon || '📁'}
                                </div>
                                {cat.accessLevel === 'restricted' && (
                                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase tracking-wide rounded-md">
                                        Hạn chế
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditCategory(cat)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => handleDeleteClick(cat)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{cat.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-2 min-h-[2.5rem]">{cat.description || 'Không có mô tả'}</p>
                        
                        <div className="border-t border-gray-50 dark:border-gray-700 pt-4">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Các trường ({cat.fields.length})</div>
                            <div className="flex flex-wrap gap-2">
                                {cat.fields.slice(0, 3).map(f => (
                                    <span key={f.id} className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-md border border-gray-100 dark:border-gray-600 flex items-center gap-1">
                                        <span className="opacity-50 text-[10px]">{getTypeIcon(f.type)}</span> {f.name}
                                    </span>
                                ))}
                                {cat.fields.length > 3 && <span className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-xs rounded-md">+{cat.fields.length - 3}</span>}
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Icon</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tên Danh Mục</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mô Tả</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Số trường</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quyền hạn</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                        <td className="px-6 py-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">
                                                {cat.icon || '📁'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{cat.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{cat.description || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                {cat.fields.length} trường
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {cat.accessLevel === 'restricted' ? (
                                                <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full">
                                                    Hạn chế
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                                                    Công khai
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEditCategory(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="Sửa">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={() => handleDeleteClick(cat)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Xóa">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {categories.length === 0 && (
                <div className="col-span-full py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center text-4xl mb-4">📭</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chưa có danh mục nào</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2 mb-6">Hãy tạo danh mục đầu tiên để bắt đầu quản lý dữ liệu.</p>
                    <button
                        onClick={() => { setCurrentCategory({ name: '', description: '', fields: [], accessLevel: 'public', icon: '📁' }); setIsEditing(true); }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg font-medium"
                    >
                        Tạo mới ngay
                    </button>
                </div>
            )}
          </>
      )}

       {/* Delete Confirmation Modal */}
       {categoryToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setCategoryToDelete(null)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm relative z-20 animate-scale-in p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Xóa Danh Mục?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                            Bạn sắp xóa danh mục <b>{categoryToDelete.name}</b>. Toàn bộ dữ liệu thuộc về danh mục này cũng sẽ bị xóa vĩnh viễn và không thể khôi phục.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                        <button 
                            onClick={() => setCategoryToDelete(null)}
                            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 shadow-lg shadow-red-500/30 transition transform active:scale-95"
                        >
                            Xóa vĩnh viễn
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};