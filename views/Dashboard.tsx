
import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { dataService, authService, projectService } from '../services/storage';
import { supabase } from '../services/supabase';
import { ResourceItem } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<{
    totalCategories: number;
    totalResources: number;
    totalUsers: number;
    totalProjects: number;
    resourcesByCategory: any[];
    projectsByStatus: any[];
    recentActivity: ResourceItem[];
  }>({ 
      totalCategories: 0, 
      totalResources: 0, 
      totalUsers: 0, 
      totalProjects: 0,
      resourcesByCategory: [], 
      projectsByStatus: [],
      recentActivity: [] 
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadData = async () => {
    try {
        const [cats, res, users, projects] = await Promise.all([
            dataService.getCategories(),
            dataService.getResources(),
            authService.getAllUsers(),
            projectService.getAll()
        ]);
        
        // 1. Resources by Category
        const categoryCounts = cats.map(c => {
            const count = res.filter(r => r.categoryId === c.id).length;
            return { name: c.name, value: count };
        }).filter(item => item.value > 0);

        // 2. Projects by Status
        const activeProjects = projects.filter(p => p.status === 'active').length;
        const completedProjects = projects.filter(p => p.status === 'completed').length;
        const pausedProjects = projects.filter(p => p.status === 'paused').length;

        const projectStatusData = [
            { name: 'Đang chạy', value: activeProjects, color: '#10b981' }, // Emerald-500
            { name: 'Hoàn thành', value: completedProjects, color: '#3b82f6' }, // Blue-500
            { name: 'Tạm dừng', value: pausedProjects, color: '#f59e0b' }, // Amber-500
        ].filter(item => item.value > 0);

        // 3. Recent activity
        const recent = [...res].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

        setStats({
            totalCategories: cats.length,
            totalResources: res.length,
            totalUsers: users.length,
            totalProjects: projects.length,
            resourcesByCategory: categoryCounts,
            projectsByStatus: projectStatusData,
            recentActivity: recent
        });

        // Get current user for greeting
        const user = await authService.getCurrentUser();
        setCurrentUser(user);

    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime Subscription
    const channel = supabase.channel('dashboard_realtime')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
            // Reload data when any table changes
            loadData();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  // Greeting logic
  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Chào buổi sáng';
      if (hour < 18) return 'Chào buổi chiều';
      return 'Chào buổi tối';
  };

  if (loading) {
      return (
        <div className="space-y-8 animate-pulse">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl w-full mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-80">
                <div className="lg:col-span-2 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                <div className="lg:col-span-1 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            </div>
        </div>
      )
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 text-white p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="relative z-10 w-full text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2 text-blue-100 font-medium text-sm uppercase tracking-wider">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Dashboard Overview
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold mb-2 tracking-tight">
                  {getGreeting()}, <span className="block md:inline">{currentUser?.fullName || currentUser?.username}!</span>
              </h1>
              <p className="text-blue-100 max-w-xl text-sm md:text-lg opacity-90 leading-relaxed mx-auto md:mx-0">
                  Chào mừng trở lại. Dưới đây là tóm tắt hoạt động và tài nguyên hệ thống hôm nay.
              </p>
          </div>
          
          {/* Abstract Decoration */}
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-20 pointer-events-none">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                    <path fill="#FFFFFF" d="M42.7,-62.9C50.9,-52.8,50.1,-34.4,51.7,-19.2C53.4,-4,57.4,8,54.6,18.7C51.8,29.4,42.2,38.8,31.7,46.3C21.2,53.8,9.8,59.3,-2.6,62.9C-15,66.5,-28.4,68.2,-37.6,60.2C-46.8,52.2,-51.8,34.5,-53.5,17.9C-55.2,1.3,-53.6,-14.2,-46.3,-25.9C-39,-37.6,-26,-45.5,-13.4,-56.3C-0.8,-67.1,11.3,-80.8,24.7,-78.9C38.1,-77,52.8,-59.5,42.7,-62.9Z" transform="translate(100 100)" />
                </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center md:items-end w-full md:w-auto mt-2 md:mt-0">
               <div className="text-center md:text-right bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                   <p className="text-xs text-blue-200 font-medium uppercase tracking-wide">Hôm nay</p>
                   <p className="text-lg md:text-xl font-bold">{new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}</p>
               </div>
          </div>
      </div>
      
      {/* Stats Cards - Optimized Grid for Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1 */}
        <div className="group bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/60 hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xl md:text-2xl shadow-lg shadow-blue-500/30 mb-3 md:mb-4">
                    📂
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-semibold uppercase tracking-wider">Danh mục</p>
                <div className="flex items-end gap-2 mt-1">
                    <p className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">{stats.totalCategories}</p>
                    <span className="text-xs md:text-sm font-medium text-emerald-500 mb-1">Active</span>
                </div>
            </div>
        </div>
        
        {/* Card 2 */}
        <div className="group bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/60 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-xl md:text-2xl shadow-lg shadow-emerald-500/30 mb-3 md:mb-4">
                    💾
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-semibold uppercase tracking-wider">Bản ghi</p>
                <div className="flex items-end gap-2 mt-1">
                    <p className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">{stats.totalResources}</p>
                    <span className="text-xs md:text-sm font-medium text-emerald-500 mb-1">↑ New</span>
                </div>
            </div>
        </div>

        {/* Card 3 */}
        <div className="group bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/60 hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 dark:bg-purple-900/10 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center text-xl md:text-2xl shadow-lg shadow-purple-500/30 mb-3 md:mb-4">
                    👥
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-semibold uppercase tracking-wider">Thành viên</p>
                <div className="flex items-end gap-2 mt-1">
                    <p className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">{stats.totalUsers}</p>
                    <span className="text-xs md:text-sm font-medium text-slate-400 mb-1">Users</span>
                </div>
            </div>
        </div>

        {/* Card 4 */}
        <div className="group bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/60 hover:border-orange-500/30 transition-all duration-300 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 dark:bg-orange-900/10 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center text-xl md:text-2xl shadow-lg shadow-orange-500/30 mb-3 md:mb-4">
                    🏗️
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-semibold uppercase tracking-wider">Dự án</p>
                <div className="flex items-end gap-2 mt-1">
                    <p className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">{stats.totalProjects}</p>
                    <span className="text-xs md:text-sm font-medium text-orange-500 mb-1">Managed</span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: Resources by Category */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/60">
                <div className="flex justify-between items-center mb-6 md:mb-8">
                    <div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">Phân bố Dữ liệu</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Tỷ lệ bản ghi theo từng danh mục.</p>
                    </div>
                </div>
                {stats.resourcesByCategory.length > 0 ? (
                    <div className="h-64 md:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats.resourcesByCategory}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={6}
                            >
                                {stats.resourcesByCategory.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="drop-shadow-sm outline-none" />
                                ))}
                            </Pie>
                            <Tooltip 
                                cursor={{fill: 'rgba(0,0,0,0.05)'}} 
                                contentStyle={{
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                    backgroundColor: '#ffffff',
                                    color: '#1e293b',
                                    padding: '12px 16px'
                                }}
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                align="center" 
                                iconType="circle"
                                iconSize={10}
                                wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '10px' }}
                            />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-72 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                        <span className="text-5xl mb-4 opacity-50">📊</span>
                        <p className="font-medium">Chưa có dữ liệu để hiển thị</p>
                    </div>
                )}
            </div>
        </div>

        {/* Right Column: Charts & Activity */}
        <div className="lg:col-span-1 space-y-6 md:space-y-8">
            {/* Project Status Chart - Redesigned */}
             <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/60 flex flex-col">
                <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-2">Tiến độ Dự án</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-6">Trạng thái tổng quan của {stats.totalProjects} dự án.</p>
                
                {stats.projectsByStatus.length > 0 ? (
                    <div className="flex flex-col items-center">
                        <div className="h-48 md:h-60 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.projectsByStatus}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={6}
                                >
                                {stats.projectsByStatus.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} className="drop-shadow-sm outline-none" />
                                ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '8px 12px'}} />
                            </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                                <span className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white leading-none">{stats.totalProjects}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Dự án</span>
                            </div>
                        </div>

                        {/* Custom Legend */}
                        <div className="w-full mt-4 space-y-3">
                            {stats.projectsByStatus.map((item: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{item.value}</span>
                                        <span className="text-xs text-slate-400 w-8 text-right">
                                            {Math.round((item.value / stats.totalProjects) * 100)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-60 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-2xl">
                        <span className="text-3xl mb-2">🏗️</span>
                        <span className="text-sm font-medium">Chưa có dự án nào</span>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/60">
                <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-6">Hoạt động gần đây</h3>
                <div className="space-y-6 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700"></div>

                    {stats.recentActivity.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Chưa có hoạt động nào</p>}
                    
                    {stats.recentActivity.map((item) => (
                        <div key={item.id} className="flex items-start relative group">
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold mr-4 z-10 border-4 border-white dark:border-slate-800 shadow-sm transition-transform group-hover:scale-110 shrink-0">
                                ⚡
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-2xl hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm text-slate-800 dark:text-slate-200 font-bold">Dữ liệu mới</p>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{item.createdBy}</span> đã thêm bản ghi mới.
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
