
import React, { useState, useEffect } from 'react';
import { Project, User, PERMISSIONS } from '../types';
import { projectService } from '../services/storage';
import { supabase } from '../services/supabase';

interface ProjectManagerProps {
  currentUser: User;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ currentUser, showToast }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Partial<Project>>({
    name: '',
    code: '',
    description: '',
    status: 'active'
  });
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // View Mode State
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadProjects();

    const channel = supabase.channel('realtime_projects')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
            loadProjects();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, itemsPerPage]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (e) {
      showToast('Lỗi tải danh sách dự án', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setCurrentProject(project);
    } else {
      setCurrentProject({ name: '', code: '', description: '', status: 'active' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject.code?.trim()) {
      showToast('Mã dự án không được để trống', 'error');
      return;
    }
    if (!currentProject.name?.trim()) {
      showToast('Tên dự án không được để trống', 'error');
      return;
    }

    try {
      // Check for duplicates
      const exists = await projectService.checkCodeExists(currentProject.code, currentProject.id);
      if (exists) {
        showToast('Mã dự án này đã tồn tại, vui lòng chọn mã khác', 'error');
        return;
      }

      await projectService.save(currentProject);
      setIsModalOpen(false);
      showToast('Lưu dự án thành công', 'success');
      // loadProjects handled by realtime
    } catch (e) {
      showToast('Lỗi lưu dự án', 'error');
    }
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      try {
        await projectService.delete(projectToDelete.id);
        setProjectToDelete(null);
        showToast('Đã xóa dự án', 'success');
        // loadProjects handled by realtime
      } catch (e) {
        showToast('Lỗi xóa dự án', 'error');
      }
    }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'active': return <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Đang chạy</span>;
          case 'completed': return <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Hoàn thành</span>;
          case 'paused': return <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Tạm dừng</span>;
          default: return null;
      }
  }

  // --- Filtering Logic ---
  const filteredProjects = projects.filter(project => {
      const term = searchTerm.toLowerCase();
      // Add safe check for null properties
      const name = (project.name || '').toLowerCase();
      const code = (project.code || '').toLowerCase();
      
      const matchesSearch = name.includes(term) || code.includes(term);
      const matchesStatus = filterStatus === 'all' || project.status === filterStatus;

      return matchesSearch && matchesStatus;
  });

  // Ensure pagination valid
  useEffect(() => {
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
    }
  }, [filteredProjects.length, itemsPerPage]);

  // Pagination Logic (Use filteredProjects)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Kanban Columns
  const kanbanColumns = [
      { id: 'active', title: 'Đang chạy', color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800' },
      { id: 'paused', title: 'Tạm dừng', color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800' },
      { id: 'completed', title: 'Hoàn thành', color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800' }
  ];

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col pb-10">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Dự án</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Theo dõi tiến độ và trạng thái các dự án.</p>
        </div>
        
        <div className="flex items-center gap-3">
             {/* View Toggle */}
            <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center shadow-sm">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    title="Danh sách"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <button 
                    onClick={() => setViewMode('board')}
                    className={`p-2 rounded-md transition ${viewMode === 'board' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    title="Kanban Board"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                </button>
            </div>

            {/* Only Admin/Manager can create projects */}
            {PERMISSIONS.canManageProjects(currentUser) && (
            <button
                onClick={() => handleOpenModal()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 font-bold transition active:scale-95 whitespace-nowrap"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">Dự án mới</span>
            </button>
            )}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
                type="text" 
                placeholder="Tìm kiếm theo tên hoặc mã dự án..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
            />
        </div>
        <div className="sm:w-48">
             <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
             >
                 <option value="all">Tất cả trạng thái</option>
                 <option value="active">Đang hoạt động</option>
                 <option value="completed">Hoàn thành</option>
                 <option value="paused">Tạm dừng</option>
             </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 opacity-50 flex flex-col items-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
             <p className="text-gray-500">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
        {/* LIST VIEW */}
        {viewMode === 'list' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col relative">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mã Dự Án</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tên Dự Án</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trạng Thái</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ngày tạo</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right sticky right-0 bg-gray-50 dark:bg-gray-700 backdrop-blur-sm z-10 shadow-[-4px_0_12px_-2px_rgba(0,0,0,0.05)]">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {currentProjects.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-10 text-gray-500">
                                {searchTerm || filterStatus !== 'all' ? 'Không tìm thấy dự án nào phù hợp bộ lọc' : 'Chưa có dự án nào'}
                            </td>
                        </tr>
                    )}
                    {currentProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group">
                        <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                            {searchTerm && project.code.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                                <span className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">{project.code}</span>
                            ) : project.code}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            <div className="font-bold">
                                {searchTerm && project.name.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                                    <span className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">{project.name}</span>
                                ) : project.name}
                            </div>
                            <div className="text-gray-500 text-xs truncate max-w-xs mt-0.5">{project.description}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">{getStatusBadge(project.status)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {new Date(project.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 text-right sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50/80 dark:group-hover:bg-gray-700/30 transition-colors z-10">
                        {PERMISSIONS.canManageProjects(currentUser) ? (
                            <div className="flex justify-end gap-2">
                            <button onClick={() => handleOpenModal(project)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="Sửa">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => setProjectToDelete(project)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Xóa">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            </div>
                        ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs italic">Chỉ xem</span>
                        )}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {filteredProjects.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>Hiển thị</span>
                        <select 
                            value={itemsPerPage} 
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); }}
                            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-1 outline-none"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                        <span>dòng / trang</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProjects.length)} của {filteredProjects.length}
                        </span>
                        <div className="flex items-center space-x-1">
                            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className={`p-2 rounded-md border ${currentPage === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="hidden sm:flex space-x-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                                    <button key={number} onClick={() => paginate(number)} className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm font-medium transition ${currentPage === number ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                                        {number}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className={`p-2 rounded-md border ${currentPage === totalPages ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        )}

        {/* KANBAN BOARD VIEW */}
        {viewMode === 'board' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-x-auto pb-4">
                 {kanbanColumns.map(col => {
                     const colProjects = filteredProjects.filter(p => p.status === col.id);
                     return (
                         <div key={col.id} className={`flex flex-col h-full min-h-[500px] rounded-2xl border ${col.border} ${col.bg} p-4`}>
                             <div className="flex items-center justify-between mb-4">
                                 <div className="flex items-center gap-2">
                                     <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                                     <h3 className="font-bold text-gray-700 dark:text-gray-200">{col.title}</h3>
                                     <span className="px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 text-xs font-bold text-gray-500 shadow-sm">
                                         {colProjects.length}
                                     </span>
                                 </div>
                             </div>

                             <div className="flex-1 space-y-3">
                                 {colProjects.length === 0 && (
                                     <div className="h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 text-sm italic">
                                         Trống
                                     </div>
                                 )}
                                 {colProjects.map(project => (
                                     <div key={project.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition group cursor-pointer relative" onClick={() => PERMISSIONS.canManageProjects(currentUser) && handleOpenModal(project)}>
                                         <div className="flex justify-between items-start mb-2">
                                             <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                                 {project.code}
                                             </span>
                                             {PERMISSIONS.canManageProjects(currentUser) && (
                                                 <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm">
                                                     <button 
                                                        onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }} 
                                                        className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded"
                                                        title="Xóa"
                                                     >
                                                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                     </button>
                                                 </div>
                                             )}
                                         </div>
                                         <h4 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">{project.name}</h4>
                                         <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-3">{project.description || 'Không có mô tả'}</p>
                                         
                                         <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700">
                                             <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold">
                                                 <span>📅 {new Date(project.createdAt).toLocaleDateString('vi-VN')}</span>
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     );
                 })}
             </div>
        )}
        </>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && PERMISSIONS.canManageProjects(currentUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg relative z-10 p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{currentProject.id ? 'Cập nhật Dự Án' : 'Thêm Dự Án Mới'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mã dự án <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        value={currentProject.code}
                        onChange={(e) => setCurrentProject({ ...currentProject, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="VD: PRJ-001"
                        required
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trạng thái</label>
                     <select
                        value={currentProject.status}
                        onChange={(e) => setCurrentProject({ ...currentProject, status: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                     >
                         <option value="active">Đang hoạt động</option>
                         <option value="completed">Hoàn thành</option>
                         <option value="paused">Tạm dừng</option>
                     </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên dự án <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={currentProject.name}
                  onChange={(e) => setCurrentProject({ ...currentProject, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nhập tên dự án..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mô tả</label>
                <textarea
                  value={currentProject.description}
                  onChange={(e) => setCurrentProject({ ...currentProject, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                  placeholder="Mô tả chi tiết về dự án..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setProjectToDelete(null)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm relative z-10 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center">Xóa Dự Án?</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mt-2">Bạn có chắc muốn xóa dự án <b>{projectToDelete.name}</b>? Dữ liệu liên quan có thể bị ảnh hưởng.</p>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setProjectToDelete(null)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">Hủy</button>
                    <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Xóa</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
