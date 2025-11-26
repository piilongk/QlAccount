
import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { auditService } from '../services/storage';
import { supabase } from '../services/supabase';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('');

  useEffect(() => {
    loadLogs();
    
    // Realtime logs
    const channel = supabase.channel('realtime_audit')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
            setLogs(prev => [payload.new as AuditLog, ...prev]);
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
        const data = await auditService.getLogs();
        setLogs(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
      switch(action) {
          case 'CREATE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
          case 'UPDATE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
          case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
          case 'LOGIN': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

  const filteredLogs = logs.filter(log => {
      const matchesAction = filterAction === 'all' || log.action === filterAction;
      const matchesUser = log.username?.toLowerCase().includes(filterUser.toLowerCase()) || 
                          log.details?.toLowerCase().includes(filterUser.toLowerCase());
      return matchesAction && matchesUser;
  });

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col pb-10">
      <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Nhật ký hoạt động</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Theo dõi lịch sử thao tác hệ thống (Audit Logs).</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="sm:w-48">
              <select 
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none cursor-pointer"
              >
                  <option value="all">Tất cả hành động</option>
                  <option value="CREATE">Tạo mới (Create)</option>
                  <option value="UPDATE">Cập nhật (Update)</option>
                  <option value="DELETE">Xóa (Delete)</option>
                  <option value="LOGIN">Đăng nhập (Login)</option>
              </select>
          </div>
          <div className="flex-1">
              <input 
                type="text" 
                placeholder="Tìm kiếm theo người dùng hoặc chi tiết..." 
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none"
              />
          </div>
          <button onClick={loadLogs} className="px-4 py-2.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition">
              Làm mới
          </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 relative">
          <div className="overflow-x-auto h-full">
              <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Thời gian</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Hành động</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Đối tượng</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Người thực hiện</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chi tiết</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {loading && logs.length === 0 && (
                          <tr><td colSpan={5} className="text-center py-10 text-gray-500">Đang tải nhật ký...</td></tr>
                      )}
                      {!loading && filteredLogs.length === 0 && (
                          <tr><td colSpan={5} className="text-center py-10 text-gray-500">Không tìm thấy nhật ký nào</td></tr>
                      )}
                      {filteredLogs.map(log => (
                          <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition text-sm">
                              <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {new Date(log.created_at).toLocaleString('vi-VN')}
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${getActionColor(log.action)}`}>
                                      {log.action}
                                  </span>
                              </td>
                              <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">
                                  {log.target}
                              </td>
                              <td className="px-6 py-4 text-gray-900 dark:text-white font-semibold">
                                  {log.username || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                  {log.details}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
