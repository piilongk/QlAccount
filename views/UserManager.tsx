
import React, { useState, useEffect, useRef } from 'react';
import { User, Role } from '../types';
import { authService } from '../services/storage';
import { supabase } from '../services/supabase';

interface UserManagerProps {
  currentUser: User;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser, showToast }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Role Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('user');
  
  // Deletion State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Column Customization State
  const [visibleColumns, setVisibleColumns] = useState({
      account: true,
      fullName: true,
      role: true,
      email: true
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUsers();
    
    const channel = supabase.channel('realtime_users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            loadUsers();
        })
        .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
        if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
            setShowColumnMenu(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        supabase.removeChannel(channel);
    };
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, itemsPerPage]);

  const loadUsers = async () => {
    setLoading(true);
    try {
        const u = await authService.getAllUsers();
        setUsers(u);
    } catch(e) {
        showToast('Lỗi tải danh sách người dùng', 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
  };

  const handleDeleteClick = (user: User) => {
      if (user.id === currentUser.id) {
          showToast('Bạn không thể tự xóa tài khoản của chính mình!', 'error');
          return;
      }
      setUserToDelete(user);
  };

  const confirmDelete = async () => {
      if (userToDelete) {
          try {
              await authService.deleteUser(userToDelete.id);
              showToast(`Đã xóa người dùng ${userToDelete.username}`, 'success');
              setUserToDelete(null);
              // loadUsers triggered by realtime
          } catch (e) {
              showToast('Có lỗi xảy ra khi xóa người dùng', 'error');
          }
      }
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    
    if (editingUser.id === currentUser.id && selectedRole !== 'admin') {
        if (!window.confirm('CẢNH BÁO: Bạn đang tự hạ quyền của chính mình. Sau khi lưu, bạn có thể mất quyền truy cập trang quản lý này. Bạn có chắc chắn?')) {
            return;
        }
    }

    try {
        await authService.updateUserRole(editingUser.id, selectedRole);
        showToast(`Đã cập nhật quyền cho ${editingUser.username}`, 'success');
        setEditingUser(null);
        // loadUsers triggered by realtime
    } catch (error: any) {
        showToast(error.message, 'error');
    }
  };

  const renderRoleBadge = (role: Role) => {
      switch (role) {
          case 'admin':
              return (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      ADMIN
                  </span>
              );
          case 'manager':
              return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    QUẢN LÝ
                </span>
              );
          default:
              return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm">
                     <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    NHÂN VIÊN
                </span>
              );
      }
  };

  const renderAvatar = (user: User) => {
    if (user.avatarUrl) {
        return <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-600 shadow-sm" />;
    }
    return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-200 dark:shadow-none">
            {(user.username || '?')[0].toUpperCase()}
        </div>
    );
  };

  // --- Filtering Logic ---
  const filteredUsers = users.filter(user => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        (user.username || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        (user.fullName || '').toLowerCase().includes(term);
      
      const matchesRole = filterRole === 'all' || user.role === filterRole;

      return matchesSearch && matchesRole;
  });

  // Ensure pagination valid
  useEffect(() => {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
    }
  }, [filteredUsers.length, itemsPerPage]);

  // --- Pagination Logic ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    user: users.filter(u => u.role === 'user').length
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải danh sách thành viên...</div>;

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col pb-10">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Thành viên</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Phân quyền và quản lý tài khoản người dùng trong hệ thống.</p>
        </div>
        
        {/* Column Config Dropdown */}
        <div className="relative" ref={columnMenuRef}>
            <button 
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="w-full lg:w-auto px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm flex items-center justify-center gap-2 transition"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                Tùy chỉnh cột
            </button>
            {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-2 animate-scale-in">
                    <p className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hiển thị cột</p>
                    <div className="space-y-1">
                        <label className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={visibleColumns.account}
                                onChange={(e) => setVisibleColumns(prev => ({...prev, account: e.target.checked}))}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600" 
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Tài khoản (Username)</span>
                        </label>
                        <label className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={visibleColumns.fullName}
                                onChange={(e) => setVisibleColumns(prev => ({...prev, fullName: e.target.checked}))}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600" 
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Họ và tên</span>
                        </label>
                        <label className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={visibleColumns.email}
                                onChange={(e) => setVisibleColumns(prev => ({...prev, email: e.target.checked}))}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600" 
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Email</span>
                        </label>
                        <label className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={visibleColumns.role}
                                onChange={(e) => setVisibleColumns(prev => ({...prev, role: e.target.checked}))}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600" 
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Vai trò</span>
                        </label>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-gray-700 flex items-center space-x-4 transition hover:-translate-y-1">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shadow-sm">
            👥
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wide">Tổng thành viên</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-gray-700 flex items-center space-x-4 transition hover:-translate-y-1">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-sm">
            🛡️
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wide">Admin</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{stats.admin}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-gray-700 flex items-center space-x-4 transition hover:-translate-y-1">
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl shadow-sm">
            💼
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wide">Quản lý</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{stats.manager}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-gray-700 flex items-center space-x-4 transition hover:-translate-y-1">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-sm">
            👤
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wide">Nhân viên</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{stats.user}</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
                type="text" 
                placeholder="Tìm kiếm theo tên, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
            />
        </div>
        <div className="sm:w-48">
             <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
             >
                 <option value="all">Tất cả vai trò</option>
                 <option value="admin">Admin</option>
                 <option value="manager">Quản lý</option>
                 <option value="user">Nhân viên</option>
             </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] dark:shadow-none border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                {visibleColumns.account && <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tài khoản</th>}
                {visibleColumns.fullName && <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Họ và tên</th>}
                {visibleColumns.email && <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>}
                {visibleColumns.role && <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vai trò</th>}
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right sticky right-0 bg-gray-50 dark:bg-gray-700 backdrop-blur-sm z-10 shadow-[-4px_0_12px_-2px_rgba(0,0,0,0.05)]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
               {currentUsers.length === 0 && (
                  <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">
                          {searchTerm || filterRole !== 'all' ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có thành viên nào'}
                      </td>
                  </tr>
              )}
              {currentUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition duration-150">
                  {visibleColumns.account && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                            {renderAvatar(user)}
                            <span className="font-bold text-gray-900 dark:text-white text-sm">
                                {/* Highlight if searching */}
                                {searchTerm && user.username.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                                    <span className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">{user.username}</span>
                                ) : user.username}
                            </span>
                        </div>
                      </td>
                  )}
                  {visibleColumns.fullName && (
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                         {searchTerm && user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                             <span className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">{user.fullName}</span>
                         ) : (user.fullName || '—')}
                    </td>
                  )}
                  {visibleColumns.email && (
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm && user.email.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                             <span className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">{user.email}</span>
                         ) : user.email}
                    </td>
                  )}
                  {visibleColumns.role && (
                    <td className="px-6 py-4">
                        {renderRoleBadge(user.role)}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50/80 dark:group-hover:bg-gray-700/30 transition-colors z-10">
                    <div className="flex justify-end gap-2">
                        <button
                        onClick={() => handleEditClick(user)}
                        title="Chỉnh sửa quyền"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition"
                        >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        {user.id !== currentUser.id && (
                            <button
                            onClick={() => handleDeleteClick(user)}
                            title="Xóa người dùng"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition"
                            >
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
        
        {/* Pagination Footer - Mobile Optimized */}
        {filteredUsers.length > 0 && (
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
                        {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredUsers.length)} của {filteredUsers.length}
                    </span>
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-md border ${currentPage === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        
                        <div className="hidden sm:flex space-x-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                                <button
                                    key={number}
                                    onClick={() => paginate(number)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm font-medium transition ${
                                        currentPage === number
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {number}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-md border ${currentPage === totalPages ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Role Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setEditingUser(null)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-scale-in overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Phân quyền thành viên</h3>
              <button onClick={() => setEditingUser(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/50 dark:bg-gray-600/50 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-500 transition">&times;</button>
            </div>
            
            <div className="p-6">
                <div className="flex items-center gap-4 mb-8">
                      {renderAvatar(editingUser)}
                      <div>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{editingUser.username}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{editingUser.email}</p>
                      </div>
                </div>

                <div className="space-y-4">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chọn vai trò mới</p>
                    <div className="grid gap-3">
                        <label className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'admin' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-500/50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                            <div className="flex items-center h-5 mt-0.5">
                                <input type="radio" name="role" value="admin" checked={selectedRole === 'admin'} onChange={() => setSelectedRole('admin')} className="w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500" />
                            </div>
                            <div className="ml-3">
                                <span className="block font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center text-xs">🛡️</span>
                                    Quản trị viên (Admin)
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 block">Toàn quyền hệ thống, quản lý cấu trúc dữ liệu và phân quyền người dùng.</span>
                            </div>
                        </label>

                        <label className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'manager' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500/50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                            <div className="flex items-center h-5 mt-0.5">
                                <input type="radio" name="role" value="manager" checked={selectedRole === 'manager'} onChange={() => setSelectedRole('manager')} className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500" />
                            </div>
                            <div className="ml-3">
                                <span className="block font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center text-xs">💼</span>
                                    Quản lý (Manager)
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 block">Quản lý toàn bộ dữ liệu, xem tất cả danh mục (kể cả Hạn chế), không sửa cấu trúc.</span>
                            </div>
                        </label>

                        <label className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'user' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                            <div className="flex items-center h-5 mt-0.5">
                                <input type="radio" name="role" value="user" checked={selectedRole === 'user'} onChange={() => setSelectedRole('user')} className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500" />
                            </div>
                            <div className="ml-3">
                                <span className="block font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">👤</span>
                                    Nhân viên (User)
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 block">Chỉ xem danh mục Công khai. Chỉ được sửa/xóa dữ liệu do chính mình tạo ra.</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="mt-8 flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => setEditingUser(null)} className="flex-1 py-2.5 text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition shadow-sm">Hủy bỏ</button>
                    <button onClick={handleSaveRole} className="flex-1 py-2.5 text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition transform active:scale-[0.98]">Lưu thay đổi</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setUserToDelete(null)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm relative z-20 animate-scale-in p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Xóa Người Dùng?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                            Bạn sắp xóa tài khoản <b>{userToDelete.username}</b>. Hành động này không thể hoàn tác.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                        <button 
                            onClick={() => setUserToDelete(null)}
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
