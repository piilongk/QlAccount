

import { User, Category, ResourceItem, Role, SystemConfig, Project, AuditLog } from '../types';
import { supabase } from './supabase';

// Helper to generate UUIDs client-side if needed (Supabase usually handles this, but good for optimistic UI)
export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback for environments where crypto.randomUUID is not available (e.g. non-secure contexts)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const DEFAULT_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Crect width='100' height='100' rx='20' fill='url(%23paint0_linear)'/%3E%3Cpath d='M30 50L45 65L70 35' stroke='white' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cdefs%3E%3ClinearGradient id='paint0_linear' x1='0' y1='0' x2='100' y2='100' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%232563EB'/%3E%3Cstop offset='1' stop-color='%234F46E5'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";

const DEFAULT_CONFIG: SystemConfig = {
    siteName: 'ResourceVault VN',
    siteDescription: 'Hệ thống quản lý tài nguyên linh hoạt, bảo mật và hiệu quả dành cho doanh nghiệp hiện đại.',
    contactEmail: 'support@resourcevault.vn',
    footerText: '© 2024 ResourceVault Enterprise Edition',
    logoUrl: DEFAULT_LOGO,
    faviconUrl: DEFAULT_LOGO,
    allowRegistration: true
};

// --- AUDIT SERVICE ---
export const auditService = {
    log: async (action: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE', target: string, details: string, userId?: string, username?: string) => {
        try {
            // If user info not provided, try to get current session
            let uid = userId;
            let uname = username;

            if (!uid) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    uid = session.user.id;
                    // Try to get username from profile if not provided
                    if (!uname) {
                         const { data } = await supabase.from('profiles').select('username').eq('id', uid).single();
                         uname = data?.username || session.user.email;
                    }
                }
            }

            if (!uid) return; // Can't log without user

            await supabase.from('audit_logs').insert({
                user_id: uid,
                username: uname,
                action,
                target,
                details
            });
        } catch (e) {
            console.warn("Failed to write audit log", e); // Non-blocking error
        }
    },

    getLogs: async (): Promise<AuditLog[]> => {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100); // Limit to last 100 logs for performance
        
        if (error) throw new Error(error.message);
        return data as AuditLog[];
    }
};

export const authService = {
  login: async (identifier: string, password: string): Promise<User | null> => {
    // 1. Resolve identifier: Check if it's a username (no @)
    let emailToUse = identifier;
    
    if (!identifier.includes('@')) {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', identifier)
            .single();
        if (profileData) {
            emailToUse = profileData.email;
        }
    }

    // 2. Authenticate with Supabase Auth (Email/Password)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) return null;

    // 3. Fetch extended profile data
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
    
    // Self-healing logic... (omitted for brevity, assumed same as before)
    if (profileError && profileError.code === 'PGRST116') {
         await supabase.from('profiles').insert([{
            id: authData.user.id,
            email: authData.user.email,
            username: authData.user.email?.split('@')[0] || 'user',
            role: 'user',
            full_name: ''
         }]);
    }

    const user: User = {
        id: profile?.id || authData.user.id,
        username: profile?.username || authData.user.email!.split('@')[0],
        email: profile?.email || authData.user.email!,
        role: (profile?.role as Role) || 'user',
        fullName: profile?.full_name,
        avatarUrl: profile?.avatar_url
    };

    // LOGGING
    auditService.log('LOGIN', 'System', 'Người dùng đăng nhập thành công', user.id, user.username);
    
    return user;
  },
  
  register: async (username: string, email: string, password: string, role: Role, fullName: string): Promise<User> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Không thể tạo người dùng');

    const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
            id: authData.user.id,
            username,
            email,
            role,
            full_name: fullName
        }]);

    if (profileError) console.error("Register profile creation error:", profileError);

    // LOGGING (Using system context as we might not be logged in fully yet, or log as the new user)
    auditService.log('CREATE', 'User', `Đăng ký tài khoản mới: ${username}`, authData.user.id, username);

    return {
        id: authData.user.id,
        username,
        email,
        role,
        fullName
    };
  },

  logout: async () => {
    await supabase.auth.signOut();
  },
  
  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (profile) {
        return {
            id: profile.id,
            username: profile.username,
            email: profile.email,
            role: profile.role as Role,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url
        };
    }
    
    return { // Fallback
        id: session.user.id,
        email: session.user.email!,
        username: session.user.email?.split('@')[0] || 'user',
        role: 'user',
        fullName: '',
        avatarUrl: ''
    };
  },

  getAllUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw new Error(error.message);
    
    return data.map((p: any) => ({
        id: p.id,
        username: p.username,
        email: p.email,
        role: p.role as Role,
        fullName: p.full_name,
        avatarUrl: p.avatar_url
    }));
  },

  updateUserRole: async (userId: string, newRole: Role) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) throw new Error(error.message);
    
    // LOGGING
    auditService.log('UPDATE', 'User', `Cập nhật quyền thành viên ${userId} thành ${newRole}`);
  },

  updateUserDetails: async (userId: string, data: Partial<User>) => {
    const updates: any = {};
    if (data.fullName) updates.full_name = data.fullName;
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw new Error(error.message);
  },

  uploadAvatar: async (userId: string, file: File): Promise<string> => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw new Error('Lỗi tải ảnh lên: ' + uploadError.message);
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
  },

  uploadSystemAsset: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `assets/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('system-assets').upload(fileName, file);
    if (uploadError) throw new Error('Lỗi tải file hệ thống: ' + uploadError.message);
    const { data } = supabase.storage.from('system-assets').getPublicUrl(fileName);
    return data.publicUrl;
  },

  uploadResourceFile: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `files/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('resource-attachments').upload(fileName, file);
    if (uploadError) throw new Error('Lỗi tải file đính kèm: ' + uploadError.message);
    const { data } = supabase.storage.from('resource-attachments').getPublicUrl(fileName);
    return data.publicUrl;
  },

  updateProfile: async (userId: string, data: { fullName: string, avatarUrl: string }) => {
      const { error } = await supabase.from('profiles').update({ full_name: data.fullName, avatar_url: data.avatarUrl }).eq('id', userId);
      if (error) throw new Error(error.message);
      // LOGGING
      auditService.log('UPDATE', 'Profile', 'Cập nhật thông tin cá nhân');
  },

  changePassword: async (email: string, oldPassword: string, newPassword: string) => {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
      if (signInError) throw new Error("Mật khẩu cũ không chính xác.");
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error("Lỗi khi cập nhật mật khẩu: " + updateError.message);
      
      // LOGGING
      auditService.log('UPDATE', 'Profile', 'Thay đổi mật khẩu');
  },

  deleteUser: async (userId: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw new Error(error.message);
    // LOGGING
    auditService.log('DELETE', 'User', `Xóa người dùng ID: ${userId}`);
  }
};

export const dataService = {
  getCategories: async (): Promise<Category[]> => {
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    if (error) return [];
    return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        fields: c.fields,
        createdAt: c.created_at,
        accessLevel: c.access_level,
        icon: c.icon
    }));
  },

  saveCategory: async (category: Category) => {
    // Check if insert or update for logging
    const isNew = !category.id; 
    const payload = {
        id: category.id,
        name: category.name,
        description: category.description,
        fields: category.fields,
        access_level: category.accessLevel,
        icon: category.icon,
        created_at: category.createdAt
    };
    const { error } = await supabase.from('categories').upsert(payload);
    if (error) throw new Error(error.message);

    // LOGGING
    auditService.log(isNew ? 'CREATE' : 'UPDATE', 'Schema', `Lưu danh mục: ${category.name}`);
  },

  deleteCategory: async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
    // LOGGING
    auditService.log('DELETE', 'Schema', `Xóa danh mục ID: ${id}`);
  },

  getResources: async (categoryId?: string): Promise<ResourceItem[]> => {
    let query = supabase.from('resources').select('*');
    if (categoryId) query = query.eq('category_id', categoryId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data.map((r: any) => ({
        id: r.id,
        categoryId: r.category_id,
        data: r.data,
        createdBy: r.created_by,
        createdAt: r.created_at
    }));
  },

  saveResource: async (resource: ResourceItem) => {
    // Determine if creating or updating
    // Note: In this app logic, we might not know easily if ID exists without fetching, 
    // but 'createdAt' usually hints. Or we can assume.
    const payload = {
        id: resource.id,
        category_id: resource.categoryId,
        data: resource.data,
        created_by: resource.createdBy,
        created_at: resource.createdAt
    };
    const { error } = await supabase.from('resources').upsert(payload);
    if (error) throw new Error(error.message);

    // LOGGING
    auditService.log('UPDATE', 'Resource', `Lưu bản ghi trong danh mục ${resource.categoryId}`);
  },

  deleteResource: async (id: string) => {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) throw new Error(error.message);
    // LOGGING
    auditService.log('DELETE', 'Resource', `Xóa bản ghi ID: ${id}`);
  },
  
  getSystemConfig: async (): Promise<SystemConfig> => {
      const { data, error } = await supabase.from('system_config').select('config').limit(1).single();
      if (error || !data) return DEFAULT_CONFIG;
      return { ...DEFAULT_CONFIG, ...data.config };
  },

  saveSystemConfig: async (config: SystemConfig) => {
      const { error } = await supabase.from('system_config').upsert({ id: 1, config: config });
      if (error) throw new Error(error.message);
      // LOGGING
      auditService.log('UPDATE', 'System', 'Cập nhật cấu hình hệ thống');
  }
};

export const projectService = {
    getAll: async (): Promise<Project[]> => {
        const { data, error } = await supabase.from('projects').select('*').order('code', { ascending: true });
        if (error) throw new Error(error.message);
        return data.map((p: any) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            description: p.description,
            status: p.status,
            createdAt: p.created_at
        }));
    },

    checkCodeExists: async (code: string, excludeId?: string): Promise<boolean> => {
        let query = supabase.from('projects').select('id').eq('code', code);
        if (excludeId) query = query.neq('id', excludeId);
        const { data, error } = await query;
        if (error) return false;
        return data && data.length > 0;
    },

    save: async (project: Partial<Project>) => {
        const { error } = await supabase.from('projects').upsert({
            id: project.id,
            name: project.name,
            code: project.code,
            description: project.description,
            status: project.status,
        });
        if (error) throw new Error(error.message);
        
        // LOGGING
        auditService.log(project.id ? 'UPDATE' : 'CREATE', 'Project', `Lưu dự án: ${project.code}`);
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw new Error(error.message);
        // LOGGING
        auditService.log('DELETE', 'Project', `Xóa dự án ID: ${id}`);
    }
};