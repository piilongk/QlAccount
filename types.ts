

export type Role = 'admin' | 'manager' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Optional for security when passing user object to UI
  fullName?: string; // Full display name
  avatarUrl?: string; // URL to user avatar
  role: Role;
}

export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'textarea' | 'project' | 'user' | 'image' | 'file';

export interface FieldDefinition {
  id: string;
  name: string;
  key: string; // internal key for storage
  type: FieldType;
  required: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  fields: FieldDefinition[];
  createdAt: number;
  accessLevel: 'public' | 'restricted'; // New: Control visibility
  icon?: string; // Icon for category
}

export interface ResourceItem {
  id: string;
  categoryId: string;
  data: Record<string, any>; // Dynamic data based on fields
  createdBy: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string; // ISO string from DB
}

export interface AuditLog {
    id: string;
    user_id: string;
    username: string;
    action: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE';
    target: string;
    details: string;
    created_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface SystemConfig {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  footerText: string;
  logoUrl?: string; // URL or Data URI for site logo
  faviconUrl?: string; // URL or Data URI for browser icon
  allowRegistration?: boolean; // Enable/Disable new user registration
}

// Permission Helpers
export const PERMISSIONS = {
  canManageSchema: (user: User) => user.role === 'admin',
  
  // Projects: Only Admin and Manager can create/edit/delete projects
  canManageProjects: (user: User) => user.role === 'admin' || user.role === 'manager',

  // Data: Who can add NEW resources? (User role is now restricted from adding)
  canCreateResource: (user: User) => user.role === 'admin' || user.role === 'manager',

  canViewCategory: (user: User, category: Category) => {
    if (user.role === 'admin' || user.role === 'manager') return true;
    return category.accessLevel === 'public';
  },

  canEditResource: (user: User, resource: ResourceItem) => {
    if (user.role === 'admin' || user.role === 'manager') return true;
    return resource.createdBy === user.username;
  },

  canDeleteResource: (user: User, resource: ResourceItem) => {
    if (user.role === 'admin') return true; // Admin can delete anything
    if (user.role === 'manager') return true; // Manager can delete anything
    return resource.createdBy === user.username; // Users can only delete their own
  }
};