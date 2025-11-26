
import React, { useState, useEffect, useRef } from 'react';
import { Category, ResourceItem, User, PERMISSIONS, Project } from '../types';
import { dataService, generateUUID, projectService, authService } from '../services/storage';
import { supabase } from '../services/supabase';

interface DataManagerProps {
  currentUser: User;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

// --- Internal Component: File Upload Field ---
interface FileUploadFieldProps {
    value: string;
    onChange: (val: string) => void;
    type: 'image' | 'file';
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({ value, onChange, type }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        // Basic validation
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
             alert("File quá lớn (Max 10MB)");
             return;
        }

        setUploading(true);
        try {
            const url = await authService.uploadResourceFile(file);
            onChange(url);
        } catch (error: any) {
            console.error(error);
            alert("Lỗi tải file: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full">
            {value ? (
                <div className="relative group border border-slate-200 dark:border-slate-600 rounded-xl p-2 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-3">
                    {type === 'image' ? (
                        <img src={value} alt="Preview" className="w-16 h-16 object-cover rounded-lg bg-white dark:bg-slate-800" />
                    ) : (
                        <div className="w-16 h-16 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-2xl">
                            📎
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate break-all">{value.split('/').pop()}</p>
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Mở file</a>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => onChange('')}
                        className="absolute top-2 right-2 p-1 bg-white dark:bg-slate-600 rounded-full shadow-sm text-slate-400 hover:text-red-500 transition"
                        title="Xóa file"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            ) : (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    {uploading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    ) : (
                        <>
                            <span className="text-3xl mb-2">{type === 'image' ? '🖼️' : '📁'}</span>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Nhấn để tải {type === 'image' ? 'ảnh' : 'file'} lên</span>
                            <span className="text-xs text-slate-400 mt-1">Hỗ trợ tối đa 10MB</span>
                        </>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        accept={type === 'image' ? "image/*" : "*/*"}
                        onChange={handleFileChange}
                    />
                </div>
            )}
        </div>
    );
};

// --- Internal Component: Multi-Select User ---
interface UserMultiSelectProps {
    users: User[];
    value: any; 
    onChange: (val: string[]) => void;
}

const UserMultiSelect: React.FC<UserMultiSelectProps> = ({ users, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedIds: string[] = Array.isArray(value) ? value : (value ? [value] : []);
    const isAllSelected = selectedIds.includes('all');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (id: string) => {
        let newSelection = [...selectedIds];
        if (newSelection.includes(id)) {
            newSelection = newSelection.filter(v => v !== id);
        } else {
            newSelection.push(id);
        }
        onChange(newSelection);
    };

    const getDisplayText = () => {
        if (selectedIds.length === 0) return '-- Chọn nhân sự --';
        const hasAll = selectedIds.includes('all');
        const specificIds = selectedIds.filter(id => id !== 'all');
        const names = specificIds.map(id => {
            const u = users.find(user => user.id === id);
            return u ? (u.fullName || u.username) : 'Unknown';
        });
        if (hasAll) {
             if (names.length === 0) return 'Toàn bộ nhân sự (All)';
             return `Toàn bộ (All) + ${names.length} người khác`;
        }
        if (names.length <= 2) return names.join(', ');
        return `${names[0]}, ${names[1]} (+${names.length - 2})`;
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2.5 text-left bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none flex justify-between items-center text-slate-800 dark:text-white min-h-[44px] transition-shadow shadow-sm hover:border-blue-300"
            >
                <span className="truncate block text-sm">{getDisplayText()}</span>
                <svg className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-scale-in p-1">
                    <div 
                        onClick={() => toggleOption('all')}
                        className={`px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 ${isAllSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isAllSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500'}`}>
                            {isAllSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="font-semibold">Tất cả (All)</span>
                    </div>
                    {users.map(u => {
                        const isSelected = selectedIds.includes(u.id);
                        return (
                            <div 
                                key={u.id}
                                onClick={() => toggleOption(u.id)}
                                className={`px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500'}`}>
                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className="truncate">{u.fullName || u.username}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// --- Internal Component: Multi-Select Project ---
interface ProjectMultiSelectProps {
    projects: Project[];
    value: any;
    onChange: (val: string[]) => void;
}

const ProjectMultiSelect: React.FC<ProjectMultiSelectProps> = ({ projects, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedIds: string[] = Array.isArray(value) ? value : (value ? [value] : []);
    const isAllSelected = selectedIds.includes('all');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (id: string) => {
        let newSelection = [...selectedIds];
        if (newSelection.includes(id)) {
            newSelection = newSelection.filter(v => v !== id);
        } else {
            newSelection.push(id);
        }
        onChange(newSelection);
    };

    const getDisplayText = () => {
        if (selectedIds.length === 0) return '-- Chọn dự án --';
        const hasAll = selectedIds.includes('all');
        const specificIds = selectedIds.filter(id => id !== 'all');
        const names = specificIds.map(id => {
            const p = projects.find(proj => proj.id === id);
            return p ? p.code : 'Unknown';
        });
        if (hasAll) {
             if (names.length === 0) return 'Toàn bộ dự án (All)';
             return `Toàn bộ (All) + ${names.length} dự án khác`;
        }
        if (names.length <= 2) return names.join(', ');
        return `${names[0]}, ${names[1]} (+${names.length - 2})`;
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2.5 text-left bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none flex justify-between items-center text-slate-800 dark:text-white min-h-[44px] transition-shadow shadow-sm hover:border-blue-300"
            >
                <span className="truncate block text-sm">{getDisplayText()}</span>
                <svg className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-scale-in p-1">
                    <div 
                        onClick={() => toggleOption('all')}
                        className={`px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 ${isAllSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isAllSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500'}`}>
                            {isAllSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="font-semibold">Tất cả (All)</span>
                    </div>
                    {projects.map(p => {
                        const isSelected = selectedIds.includes(p.id);
                        return (
                            <div 
                                key={p.id}
                                onClick={() => toggleOption(p.id)}
                                className={`px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500'}`}>
                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className="truncate">{p.code} - {p.name}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const DataManager: React.FC<DataManagerProps> = ({ currentUser, showToast }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(''); 
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentResource, setCurrentResource] = useState<Partial<ResourceItem>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [resourceToView, setResourceToView] = useState<ResourceItem | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<ResourceItem | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterCreator, setFilterCreator] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [fieldFilters, setFieldFilters] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Import Ref
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const [allCats, prjs, allUsers] = await Promise.all([
                dataService.getCategories(),
                projectService.getAll(),
                authService.getAllUsers()
            ]);
            const cats = allCats.filter(c => PERMISSIONS.canViewCategory(currentUser, c));
            setCategories(cats);
            setProjects(prjs);
            setUsers(allUsers);
        } catch(e) {
            console.error(e);
            showToast('Lỗi tải dữ liệu', 'error');
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    loadResources();
    setFieldFilters({});
    setFilterCreator('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  }, [selectedCategoryId]);

  useEffect(() => {
      const channel = supabase.channel('realtime_resources')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => {
            loadResources();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [selectedCategoryId]);

  useEffect(() => { setCurrentPage(1); }, [filterCreator, filterDateFrom, filterDateTo, fieldFilters]);

  const loadResources = async () => {
    setLoading(true);
    try {
        const res = await dataService.getResources(selectedCategoryId || undefined);
        setResources(res);
    } catch(e) {
        showToast('Lỗi tải dữ liệu', 'error');
    } finally {
        setLoading(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const handleOpenModal = (resource?: ResourceItem) => {
    if (resource) {
      if (!PERMISSIONS.canEditResource(currentUser, resource)) {
          showToast('Bạn không có quyền chỉnh sửa dữ liệu này', 'error');
          return;
      }
      const resourceCat = categories.find(c => c.id === resource.categoryId);
      if(!resourceCat) {
          showToast('Không tìm thấy cấu trúc dữ liệu cho bản ghi này', 'error');
          return;
      }
      if (!selectedCategoryId) setSelectedCategoryId(resource.categoryId);
      setCurrentResource(resource);
      setFormData({ ...resource.data });
      setIsModalOpen(true);
    } else {
      if (!selectedCategoryId) {
          showToast('Vui lòng chọn một danh mục cụ thể để thêm dữ liệu', 'error');
          return;
      }
      if (!PERMISSIONS.canCreateResource(currentUser)) {
          showToast('Bạn không có quyền thêm dữ liệu mới', 'error');
          return;
      }
      setCurrentResource({});
      setFormData({});
      setIsModalOpen(true);
    }
  };

  const handleDuplicate = (e: React.MouseEvent, resource: ResourceItem) => {
      e.stopPropagation();
      if (!PERMISSIONS.canCreateResource(currentUser)) {
          showToast('Bạn không có quyền thêm dữ liệu mới', 'error');
          return;
      }
      const resourceCat = categories.find(c => c.id === resource.categoryId);
      if(!resourceCat) {
          showToast('Không tìm thấy cấu trúc dữ liệu', 'error');
          return;
      }
      if (!selectedCategoryId) setSelectedCategoryId(resource.categoryId);
      setCurrentResource({ categoryId: resource.categoryId });
      setFormData({ ...resource.data });
      setIsModalOpen(true);
      showToast('Đã sao chép dữ liệu vào form thêm mới', 'success');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const catToUse = selectedCategory || categories.find(c => c.id === currentResource.categoryId);
    if (!catToUse) {
        showToast('Lỗi xác định danh mục', 'error');
        return;
    }
    for (const field of catToUse.fields) {
      if (field.required) {
          const val = formData[field.key];
          if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
              showToast(`Vui lòng nhập ${field.name}`, 'error');
              return;
          }
      }
    }
    const resourceToSave: ResourceItem = {
      id: currentResource.id || generateUUID(),
      categoryId: catToUse.id,
      data: formData,
      createdBy: currentResource.id ? (currentResource.createdBy || currentUser.username) : currentUser.username,
      createdAt: currentResource.createdAt || Date.now()
    };
    try {
        await dataService.saveResource(resourceToSave);
        setIsModalOpen(false);
        showToast('Lưu dữ liệu thành công', 'success');
    } catch(e) {
        showToast('Lỗi lưu dữ liệu', 'error');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, resource: ResourceItem) => {
     e.stopPropagation(); 
    if (!PERMISSIONS.canDeleteResource(currentUser, resource)) {
        showToast('Bạn không có quyền xóa dữ liệu này', 'error');
        return;
    }
    setResourceToDelete(resource);
  };

  const confirmDelete = async () => {
      if (resourceToDelete) {
          try {
            await dataService.deleteResource(resourceToDelete.id);
            showToast('Đã xóa bản ghi', 'success');
            setResourceToDelete(null);
          } catch(e) {
              showToast('Lỗi xóa dữ liệu', 'error');
          }
      }
  };

  const resetFilters = () => {
    setFilterCreator('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFieldFilters({});
  };

  const copyToClipboard = (text: string, label: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      showToast(`Đã sao chép ${label}`, 'success');
  };

  const formatValueForDisplay = (field: any, value: any) => {
      if (value === null || value === undefined) return '';
      switch(field.type) {
          case 'boolean': return value === 'true' ? 'Đúng / Có' : 'Sai / Không';
          case 'project': return getProjectName(value);
          case 'user': return getUserName(value);
          case 'date': return new Date(value).toLocaleDateString('vi-VN');
          case 'image': return value ? '(Hình ảnh)' : '';
          case 'file': return value ? '(Tệp đính kèm)' : '';
          default: return String(value);
      }
  };

  const getProjectName = (value: any) => {
      if (Array.isArray(value)) {
          const names = value.map(id => {
             if (id === 'all') return 'Tất cả (All)';
             const p = projects.find(proj => proj.id === id);
             return p ? p.code : id;
          });
          return names.join(', ');
      }
      if (value === 'all') return 'Tất cả (All)';
      const p = projects.find(proj => proj.id === value);
      return p ? `${p.code} - ${p.name}` : value;
  };

  const getUserName = (value: any) => {
      if (Array.isArray(value)) {
          const names = value.map(id => {
             if (id === 'all') return 'Tất cả (All)';
             const u = users.find(usr => usr.id === id);
             return u ? (u.fullName || u.username) : id;
          });
          return names.join(', ');
      }
      if (value === 'all') return 'Tất cả (All)';
      const u = users.find(usr => usr.id === value);
      return u ? (u.fullName || u.username) : value;
  };

  const getCategoryName = (id: string) => {
      const c = categories.find(cat => cat.id === id);
      return c ? c.name : 'Unknown';
  };

  // --- CSV Import Logic ---
  const handleImportClick = () => {
      if (!selectedCategoryId) {
          showToast('Vui lòng chọn danh mục cần nhập dữ liệu trước', 'error');
          return;
      }
      if (!PERMISSIONS.canCreateResource(currentUser)) {
          showToast('Bạn không có quyền thêm dữ liệu', 'error');
          return;
      }
      importInputRef.current?.click();
  };

  // Simple CSV Parser (Regex based to handle quotes)
  const parseCSVLine = (str: string) => {
      const arr = [];
      let quote = false;
      let col = '';
      for (let c of str) {
          if (c === '"') { quote = !quote; continue; }
          if (c === ',' && !quote) { arr.push(col); col = ''; continue; }
          col += c;
      }
      arr.push(col);
      return arr;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0]) return;
      const file = e.target.files[0];
      if (!selectedCategory) return;

      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const text = event.target?.result as string;
              const lines = text.split('\n').map(l => l.trim()).filter(l => l);
              if (lines.length < 2) {
                  showToast('File không có dữ liệu', 'error');
                  setLoading(false);
                  return;
              }

              const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
              const fieldMap: Record<number, string> = {};

              // Map CSV headers to Field Keys
              headers.forEach((header, index) => {
                  const field = selectedCategory.fields.find(f => f.name.toLowerCase() === header.toLowerCase());
                  if (field) {
                      fieldMap[index] = field.key;
                  }
              });

              if (Object.keys(fieldMap).length === 0) {
                  showToast('Không tìm thấy cột nào khớp với cấu trúc dữ liệu', 'error');
                  setLoading(false);
                  return;
              }

              let successCount = 0;
              const totalRows = lines.length - 1;

              // Process Rows
              for (let i = 1; i < lines.length; i++) {
                  const values = parseCSVLine(lines[i]);
                  const resourceData: Record<string, any> = {};
                  
                  for (const colIndex in fieldMap) {
                      const key = fieldMap[colIndex];
                      const fieldDef = selectedCategory.fields.find(f => f.key === key);
                      let rawValue = values[parseInt(colIndex)] || '';
                      rawValue = rawValue.trim().replace(/^"|"$/g, ''); // clean quotes

                      if (!fieldDef) continue;

                      // Data Transformation
                      if (fieldDef.type === 'boolean') {
                          const lower = rawValue.toLowerCase();
                          resourceData[key] = (lower === 'true' || lower === 'có' || lower === 'đúng' || lower === '1') ? 'true' : 'false';
                      } 
                      else if (fieldDef.type === 'project') {
                          // Try to find project by code or name
                          const p = projects.find(proj => proj.code === rawValue || proj.name === rawValue || proj.id === rawValue);
                          resourceData[key] = p ? [p.id] : (rawValue ? [rawValue] : []); // Default to array for multi-select
                      }
                      else if (fieldDef.type === 'user') {
                          const u = users.find(usr => usr.username === rawValue || usr.fullName === rawValue || usr.email === rawValue || usr.id === rawValue);
                          resourceData[key] = u ? [u.id] : (rawValue ? [rawValue] : []);
                      }
                      else {
                          resourceData[key] = rawValue;
                      }
                  }

                  // Save
                  const resourceToSave: ResourceItem = {
                      id: generateUUID(),
                      categoryId: selectedCategory.id,
                      data: resourceData,
                      createdBy: currentUser.username,
                      createdAt: Date.now()
                  };
                  await dataService.saveResource(resourceToSave);
                  successCount++;
              }

              showToast(`Đã nhập thành công ${successCount}/${totalRows} dòng.`, 'success');
              if (importInputRef.current) importInputRef.current.value = ''; // reset

          } catch (error: any) {
              console.error(error);
              showToast('Lỗi khi xử lý file: ' + error.message, 'error');
          } finally {
              setLoading(false);
          }
      };
      reader.readAsText(file);
  };

  const renderFieldInput = (field: any) => {
    const value = formData[field.key] || '';
    const onChange = (val: any) => setFormData(prev => ({ ...prev, [field.key]: val }));
    const commonClasses = "w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400";

    switch (field.type) {
      case 'textarea': return <textarea value={value} onChange={(e) => onChange(e.target.value)} className={`${commonClasses} h-32 resize-none`} placeholder={`Nhập ${field.name.toLowerCase()}...`} />;
      case 'number': return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={commonClasses} placeholder="0" />;
      case 'date': return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={`${commonClasses} dark:[color-scheme:dark]`} />;
      case 'boolean':
        return (
            <select value={value} onChange={(e) => onChange(e.target.value)} className={commonClasses}>
                <option value="">-- Chọn giá trị --</option>
                <option value="true">✅ Có / Đúng</option>
                <option value="false">❌ Không / Sai</option>
            </select>
        );
      case 'project': return <ProjectMultiSelect projects={projects} value={value} onChange={onChange} />;
      case 'user': return <UserMultiSelect users={users} value={value} onChange={onChange} />;
      case 'image': return <FileUploadField value={value} onChange={onChange} type="image" />;
      case 'file': return <FileUploadField value={value} onChange={onChange} type="file" />;
      default: return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={commonClasses} placeholder={`Nhập ${field.name.toLowerCase()}...`} />;
    }
  };

  const renderFilterInput = (field: any) => {
    const value = fieldFilters[field.key] || '';
    const onChange = (val: string) => setFieldFilters(prev => ({...prev, [field.key]: val}));
    const baseClass = "w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none";

    switch(field.type) {
        case 'boolean':
            return (
                <select value={value} onChange={(e) => onChange(e.target.value)} className={baseClass}>
                    <option value="">Tất cả</option>
                    <option value="true">Đúng / Có</option>
                    <option value="false">Sai / Không</option>
                </select>
            );
        case 'project':
            return (
                <select value={value} onChange={(e) => onChange(e.target.value)} className={baseClass}>
                    <option value="">Tất cả dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                </select>
            );
        case 'user':
            return (
                <select value={value} onChange={(e) => onChange(e.target.value)} className={baseClass}>
                    <option value="">Tất cả người dùng</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
                </select>
            );
        case 'date': return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={`${baseClass} dark:[color-scheme:dark]`} />;
        case 'number': return <input type="number" placeholder="Tìm chính xác..." value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} />;
        case 'image':
        case 'file':
             return <input type="text" disabled placeholder="Không hỗ trợ lọc" className={`${baseClass} bg-slate-100 dark:bg-slate-800 cursor-not-allowed text-slate-400`} />;
        default: return <input type="text" placeholder={`Lọc theo ${field.name}...`} value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} />;
    }
  };

  // --- Filtering & Pagination Logic ---
  const filteredResources = resources.filter(r => {
      if (filterCreator && !r.createdBy.toLowerCase().includes(filterCreator.toLowerCase())) return false;
      const itemDate = new Date(r.createdAt);
      if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom); fromDate.setHours(0, 0, 0, 0);
          if (itemDate < fromDate) return false;
      }
      if (filterDateTo) {
          const toDate = new Date(filterDateTo); toDate.setHours(23, 59, 59, 999);
          if (itemDate > toDate) return false;
      }
      if (selectedCategory) {
          for (const key in fieldFilters) {
              const filterVal = fieldFilters[key];
              if (!filterVal) continue;
              const itemVal = r.data ? r.data[key] : null;
              if (itemVal === undefined || itemVal === null) return false;
              const fieldDef = selectedCategory.fields.find(f => f.key === key);
              if (!fieldDef) continue;
              if (fieldDef.type === 'text' || fieldDef.type === 'textarea') {
                  if (!String(itemVal).toLowerCase().includes(filterVal.toLowerCase())) return false;
              } else if (fieldDef.type === 'boolean') {
                  if (String(itemVal) !== filterVal) return false;
              } else if (fieldDef.type === 'user' || fieldDef.type === 'project') {
                  if (Array.isArray(itemVal)) {
                      if (itemVal.includes('all')) return true;
                      if (!itemVal.includes(filterVal)) return false;
                  } else {
                      if (String(itemVal) !== 'all' && String(itemVal) !== filterVal) return false;
                  }
              } else if (fieldDef.type === 'number') {
                  if (Number(itemVal) !== Number(filterVal)) return false;
              } else if (fieldDef.type === 'date') {
                  if (String(itemVal) !== filterVal) return false;
              }
          }
      }
      return true;
  });

  useEffect(() => {
    const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [filteredResources.length, itemsPerPage]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResources = filteredResources.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Export CSV Function
  const handleExportCSV = () => {
        if (!selectedCategory) {
            showToast("Vui lòng chọn một danh mục để xuất dữ liệu.", "error");
            return;
        }
        
        // 1. Headers
        const headers = ["ID", ...selectedCategory.fields.map(f => f.name), "Người tạo", "Ngày tạo"];
        
        // 2. Rows
        const rows = filteredResources.map(resource => {
            const fieldValues = selectedCategory.fields.map(f => {
                let val = resource.data?.[f.key];
                
                // Format specific types
                if (f.type === 'boolean') return val === 'true' ? 'Có' : 'Không';
                if (f.type === 'date') return val ? new Date(val).toLocaleDateString('vi-VN') : '';
                if (f.type === 'user') return getUserName(val);
                if (f.type === 'project') return getProjectName(val);
                // Clean newlines in text areas for CSV safety
                if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
                
                return val !== undefined && val !== null ? val : '';
            });

            return [
                resource.id,
                ...fieldValues,
                resource.createdBy,
                new Date(resource.createdAt).toLocaleString('vi-VN')
            ].join(",");
        });

        // 3. Combine and Download
        const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n"); // Add BOM for Excel UTF-8
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedCategory.name}_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Đã xuất file Excel (CSV) thành công!", "success");
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Quản lý Dữ liệu</h2>
           <p className="text-slate-500 dark:text-slate-400 mt-1">Xem, thêm mới và chỉnh sửa tài nguyên hệ thống.</p>
        </div>
        
        {/* Category Selector */}
        <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center w-full lg:w-auto">
            <span className="px-3 text-sm font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Danh mục:</span>
            <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-700 border-none text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 block p-2.5 font-bold w-full lg:min-w-[220px] outline-none cursor-pointer hover:bg-slate-100 transition"
            >
                <option value="">-- Tất cả danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>
      </div>
      
      {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-slate-500">Đang tải dữ liệu...</p>
          </div>
      ) : (
        <div className="flex flex-col h-full space-y-5">
            {/* Toolbar - Stacked on Mobile */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {/* View Toggle */}
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center shadow-sm flex-shrink-0">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            title="Danh sách"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            title="Lưới"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                    </div>

                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl border font-semibold flex items-center justify-center gap-2 transition-all shadow-sm whitespace-nowrap ${isFilterOpen ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 hover:shadow-md'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        <span className="hidden sm:inline">Bộ lọc</span>
                    </button>
                    
                    {selectedCategoryId && (
                        <>
                            <button
                                onClick={handleExportCSV}
                                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 font-semibold flex items-center justify-center gap-2 transition-all shadow-sm whitespace-nowrap"
                                title="Xuất dữ liệu ra Excel"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                <span className="hidden sm:inline">Xuất CSV</span>
                            </button>
                            {PERMISSIONS.canCreateResource(currentUser) && (
                                <>
                                    <input 
                                        type="file" 
                                        ref={importInputRef} 
                                        onChange={handleFileUpload} 
                                        accept=".csv" 
                                        className="hidden" 
                                    />
                                    <button
                                        onClick={handleImportClick}
                                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 font-semibold flex items-center justify-center gap-2 transition-all shadow-sm whitespace-nowrap"
                                        title="Nhập dữ liệu từ Excel/CSV"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m-4-4v12" /></svg>
                                        <span className="hidden sm:inline">Nhập CSV</span>
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
                
                {PERMISSIONS.canCreateResource(currentUser) && (
                  <button
                  onClick={() => handleOpenModal()}
                  disabled={!selectedCategoryId}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl shadow-lg font-bold transition flex items-center gap-2 whitespace-nowrap justify-center ${!selectedCategoryId ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5'}`}
                  title={!selectedCategoryId ? "Vui lòng chọn danh mục để thêm mới" : ""}
                  >
                  <span className="text-xl leading-none">+</span> Thêm mới
                  </button>
                )}
            </div>

            {/* Advanced Filters Panel */}
            {isFilterOpen && (
                <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none animate-fade-in space-y-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="flex justify-between items-center mb-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            Tìm kiếm nâng cao
                        </h4>
                        <button onClick={resetFilters} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-bold hover:underline flex items-center gap-1 transition-colors">
                            <span>&times;</span> Xóa bộ lọc
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Người tạo</label>
                            <input type="text" placeholder="Nhập username..." value={filterCreator} onChange={(e) => setFilterCreator(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                        </div>
                        <div className="lg:col-span-2 space-y-1">
                             <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Thời gian tạo</label>
                             <div className="flex items-center gap-2">
                                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none dark:[color-scheme:dark]" />
                                <span className="text-slate-400">→</span>
                                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none dark:[color-scheme:dark]" />
                             </div>
                        </div>
                        {selectedCategory ? (
                            selectedCategory.fields.map(field => (
                                <div key={field.id} className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate block" title={field.name}>{field.name}</label>
                                    {renderFilterInput(field)}
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-2 sm:p-0">
                                Chọn danh mục để lọc chi tiết
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* GRID VIEW (CARD) */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                    {currentResources.map(resource => {
                        const cat = categories.find(c => c.id === resource.categoryId);
                        // Try to find an image field for preview
                        const imageField = cat?.fields.find(f => f.type === 'image');
                        const imageUrl = imageField ? resource.data?.[imageField.key] : null;

                        return (
                            <div 
                                key={resource.id} 
                                onClick={() => setResourceToView(resource)}
                                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer group flex flex-col h-full"
                            >
                                {/* Image Preview */}
                                <div className="h-40 bg-slate-100 dark:bg-slate-700/50 relative overflow-hidden">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="Cover" className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                            <span className="text-4xl mb-2">{cat?.icon || '📄'}</span>
                                            <span className="text-xs font-medium uppercase tracking-wider">{cat?.name || 'Resource'}</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         {PERMISSIONS.canEditResource(currentUser, resource) && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleOpenModal(resource); }}
                                                className="p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg text-slate-500 hover:text-blue-600 shadow-sm backdrop-blur-sm"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                        )}
                                        {PERMISSIONS.canDeleteResource(currentUser, resource) && (
                                            <button 
                                                onClick={(e) => handleDeleteClick(e, resource)}
                                                className="p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg text-slate-500 hover:text-red-600 shadow-sm backdrop-blur-sm"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                         <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                                             {cat?.name}
                                         </span>
                                         <span className="text-[10px] text-slate-400">
                                             {new Date(resource.createdAt).toLocaleDateString()}
                                         </span>
                                    </div>

                                    <div className="space-y-1 mb-4 flex-1">
                                        {/* Display first 3 non-image/file fields as summary */}
                                        {cat?.fields.filter(f => f.type !== 'image' && f.type !== 'file').slice(0, 3).map(f => (
                                            <div key={f.id} className="text-sm">
                                                <span className="text-slate-400 text-xs mr-1">{f.name}:</span>
                                                <span className="text-slate-700 dark:text-slate-200 font-medium truncate inline-block max-w-[150px] align-bottom">
                                                    {formatValueForDisplay(f, resource.data?.[f.key]) || '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                         <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                                            {(resource.createdBy || '?')[0].toUpperCase()}
                                        </div>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{resource.createdBy}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* LIST VIEW (TABLE) */}
            {viewMode === 'list' && (
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-none border border-slate-100 dark:border-slate-700/60 overflow-hidden flex flex-col relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
                        <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700/60">
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap w-16">#</th>
                            {selectedCategory ? (
                                selectedCategory.fields.map(f => (
                                    <th key={f.id} className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[150px]">
                                        {f.name}
                                    </th>
                                ))
                            ) : (
                                <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Danh mục</th>
                            )}
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Người tạo</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Ngày tạo</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap text-right sticky right-0 bg-slate-50 dark:bg-slate-800 backdrop-blur-sm z-10 shadow-[-4px_0_12px_-2px_rgba(0,0,0,0.05)]">Thao tác</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {currentResources.length === 0 && (
                            <tr>
                                <td colSpan={(selectedCategory?.fields.length || 1) + 4} className="text-center py-24">
                                    <div className="flex flex-col items-center justify-center opacity-50">
                                        <div className="text-4xl mb-3">📭</div>
                                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Không tìm thấy dữ liệu nào</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {currentResources.map((resource, index) => (
                            <tr key={resource.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition duration-200 group">
                            <td className="px-6 py-4 text-xs font-bold text-slate-300 dark:text-slate-600">
                                {indexOfFirstItem + index + 1}
                            </td>
                            
                            {selectedCategory ? (
                                selectedCategory.fields.map(f => (
                                    <td key={f.id} className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
                                        {f.type === 'boolean' ? (
                                            (resource.data && resource.data[f.key] === 'true') ? 
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">Đúng</span> : 
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 border border-slate-200 dark:border-slate-600">Sai</span>
                                        ) : f.type === 'project' ? (
                                            <div className="flex flex-wrap gap-1">
                                                 {(() => {
                                                    const values = Array.isArray(resource.data?.[f.key]) ? resource.data?.[f.key] : (resource.data?.[f.key] ? [resource.data?.[f.key]] : []);
                                                    if (values.length === 0) return <span className="text-slate-300 italic text-xs">Trống</span>;
                                                    return values.map((val: string) => {
                                                        if (val === 'all') return <span key="all" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">ALL</span>;
                                                        const p = projects.find(proj => proj.id === val);
                                                        return <span key={val} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300 border border-cyan-100 dark:border-cyan-800"><span className="text-[10px]">🏗️</span>{p ? p.code : val}</span>;
                                                    });
                                                })()}
                                            </div>
                                        ) : f.type === 'user' ? (
                                            <div className="flex flex-wrap gap-1">
                                                {(() => {
                                                    const values = Array.isArray(resource.data?.[f.key]) ? resource.data?.[f.key] : (resource.data?.[f.key] ? [resource.data?.[f.key]] : []);
                                                    if (values.length === 0) return <span className="text-slate-300 italic text-xs">Trống</span>;
                                                    return values.map((val: string) => {
                                                        if (val === 'all') return <span key="all" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">ALL</span>;
                                                        const u = users.find(usr => usr.id === val);
                                                        return <span key={val} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border border-purple-100 dark:border-purple-800"><span className="text-[10px]">👤</span>{u ? (u.fullName || u.username) : val}</span>;
                                                    });
                                                })()}
                                            </div>
                                        ) : f.type === 'image' ? (
                                            resource.data?.[f.key] ? (
                                                <div className="group/img relative w-12 h-12">
                                                    <img src={resource.data?.[f.key]} alt="Thumb" className="w-full h-full object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                                                    <a href={resource.data?.[f.key]} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 rounded-lg transition" title="Xem ảnh gốc">
                                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </a>
                                                </div>
                                            ) : <span className="text-slate-300 italic text-xs">Không có ảnh</span>
                                        ) : f.type === 'file' ? (
                                             resource.data?.[f.key] ? (
                                                <a href={resource.data?.[f.key]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition border border-slate-200 dark:border-slate-600">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    Tải về
                                                </a>
                                             ) : <span className="text-slate-300 italic text-xs">Không có file</span>
                                        ) : (
                                            <span title={String(resource.data?.[f.key] || '')}>{String(resource.data?.[f.key] || '-')}</span>
                                        )}
                                    </td>
                                ))
                            ) : (
                                <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {getCategoryName(resource.categoryId)}
                                </td>
                            )}

                            <td className="px-6 py-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold shadow-sm">
                                        {(resource.createdBy || '?')[0].toUpperCase()}
                                    </div>
                                    <span className="text-slate-600 dark:text-slate-300 font-medium text-xs">{resource.createdBy}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                                {new Date(resource.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800 transition-colors z-10 shadow-[-4px_0_12px_-2px_rgba(0,0,0,0.05)]">
                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); setResourceToView(resource); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="Xem chi tiết">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    </button>
                                    {PERMISSIONS.canEditResource(currentUser, resource) && (
                                        <button onClick={() => handleOpenModal(resource)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition" title="Sửa">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                    )}
                                    {PERMISSIONS.canCreateResource(currentUser) && (
                                         <button onClick={(e) => handleDuplicate(e, resource)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition" title="Sao chép">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                        </button>
                                    )}
                                    {PERMISSIONS.canDeleteResource(currentUser, resource) && (
                                        <button onClick={(e) => handleDeleteClick(e, resource)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Xóa">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
            
            {/* Pagination Footer - Mobile Optimized */}
            {filteredResources.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span>Hiển thị</span>
                        <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6 outline-none shadow-sm cursor-pointer">
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                        <span>dòng</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                            {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredResources.length)} / {filteredResources.length}
                        </span>
                        <div className="flex items-center space-x-1">
                            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className={`w-8 h-8 flex items-center justify-center rounded-lg border transition ${currentPage === 1 ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 hover:border-blue-300'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="hidden sm:flex space-x-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                                    <button key={number} onClick={() => paginate(number)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition shadow-sm ${currentPage === number ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                                        {number}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className={`w-8 h-8 flex items-center justify-center rounded-lg border transition ${currentPage === totalPages ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 hover:border-blue-300'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Modals for Create/Edit/View/Delete remain with similar structure but assume inherited styles from layout changes (rounded-2xl, etc) */}
      {/* ... (Create/Edit Modal) ... */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 animate-scale-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {currentResource.id ? 'Cập nhật' : 'Thêm mới'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {categories.find(c => c.id === currentResource.categoryId)?.name || selectedCategory?.name}
                    </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                    &times;
                </button>
            </div>
            <form onSubmit={handleSave} className="p-6 md:p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(selectedCategory || categories.find(c => c.id === currentResource.categoryId))?.fields.map((field) => (
                    <div key={field.id} className={`${field.type === 'textarea' || field.type === 'user' || field.type === 'project' || field.type === 'file' || field.type === 'image' ? 'md:col-span-2' : ''}`}>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                        {field.name} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {renderFieldInput(field)}
                    </div>
                ))}
              </div>
              <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-5 py-2.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-xl font-bold transition shadow-sm">Hủy bỏ</button>
                <button type="submit" className="w-full sm:w-auto px-6 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 font-bold transition hover:-translate-y-0.5">{currentResource.id ? 'Lưu thay đổi' : 'Tạo mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ... (View & Delete Modals) ... */}
      {/* (Omitting detailed modal code for View/Delete to fit length, but assuming similar rounded-3xl and slate colors are applied implicitly by replacing entire file content) */}
      {resourceToView && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setResourceToView(null)}></div>
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative z-20 animate-scale-in">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Chi tiết dữ liệu</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{categories.find(c => c.id === resourceToView.categoryId)?.name}</p>
                    </div>
                    <button onClick={() => setResourceToView(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition">&times;</button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto">
                    <div className="space-y-8">
                        <div className="flex gap-12 pb-6 border-b border-slate-100 dark:border-slate-700/50">
                             <div>
                                 <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Người tạo</span>
                                 <div className="flex items-center gap-2 mt-1">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{(resourceToView.createdBy || '?')[0].toUpperCase()}</div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{resourceToView.createdBy}</p>
                                 </div>
                             </div>
                             <div>
                                 <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ngày tạo</span>
                                 <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{new Date(resourceToView.createdAt).toLocaleDateString()}</p>
                             </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {categories.find(c => c.id === resourceToView.categoryId)?.fields.map(field => {
                                // For images in View mode
                                if (field.type === 'image') {
                                    const imgUrl = resourceToView.data?.[field.key];
                                    return (
                                        <div key={field.id} className="md:col-span-2 group relative">
                                            <label className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2 block">{field.name}</label>
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 min-h-[48px] break-words relative">
                                                {imgUrl ? (
                                                    <img src={imgUrl} alt="Detail" className="max-w-full h-auto rounded-lg shadow-sm" />
                                                ) : <span className="text-slate-300 italic">Không có ảnh</span>}
                                            </div>
                                        </div>
                                    )
                                }
                                const displayValue = formatValueForDisplay(field, resourceToView.data?.[field.key]);
                                return (
                                    <div key={field.id} className={`${field.type === 'textarea' || field.type === 'user' || field.type === 'project' || field.type === 'file' ? 'md:col-span-2' : ''} group relative`}>
                                        <label className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2 block">{field.name}</label>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 text-sm text-slate-800 dark:text-slate-200 min-h-[48px] break-words relative pr-10">
                                            {field.type === 'file' && resourceToView.data?.[field.key] ? (
                                                <a href={resourceToView.data?.[field.key]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-2">
                                                    📎 Tải về file đính kèm
                                                </a>
                                            ) : (
                                                displayValue || <span className="text-slate-300 italic">Trống</span>
                                            )}
                                            
                                            {displayValue && field.type !== 'file' && (
                                                <button onClick={() => copyToClipboard(displayValue, field.name)} className="absolute right-2 top-2 p-1.5 text-slate-300 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition opacity-0 group-hover:opacity-100">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                 <div className="p-6 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
                    <button onClick={() => setResourceToView(null)} className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition">Đóng</button>
                </div>
            </div>
        </div>
      )}
      {resourceToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setResourceToDelete(null)}></div>
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm relative z-20 animate-scale-in p-8 border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Xác nhận xóa</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">Bạn có chắc chắn muốn xóa bản ghi này? Hành động này không thể hoàn tác được.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                        <button onClick={() => setResourceToDelete(null)} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition">Hủy bỏ</button>
                        <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-500/30 transition hover:-translate-y-0.5">Xóa vĩnh viễn</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
