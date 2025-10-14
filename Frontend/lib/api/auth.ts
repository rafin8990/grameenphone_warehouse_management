import axiosInstance from '../axios';

export interface User {
  id: number;
  name: string;
  username: string;
  email?: string;
  mobile_no?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  username: string;
  email?: string;
  mobile_no?: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

// Auth API functions
export const authAPI = {
  // Login user
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post('/auth/login', credentials);
    return response.data;
  },

  // Register user
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data;
  },

  // Get user profile
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await axiosInstance.get('/auth/profile');
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await axiosInstance.post('/auth/refresh-token', { refreshToken });
    return response.data;
  },

  // Logout (client-side only)
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // Set auth tokens
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('authToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  // Get stored tokens
  getTokens: () => {
    return {
      accessToken: localStorage.getItem('authToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    };
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('authToken');
    return !!token;
  },
};

// Demo accounts data
export const demoAccounts = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'System Administrator',
    description: 'Full system access with all permissions'
  },
  super_admin: {
    username: 'superadmin',
    password: 'super123',
    role: 'super_admin',
    name: 'Super Administrator',
    description: 'Highest level access with system management'
  },
  warehouse_manager: {
    username: 'warehouse_manager',
    password: 'warehouse123',
    role: 'warehouse_manager',
    name: 'Warehouse Manager',
    description: 'Warehouse operations and inventory management'
  },
  room_person: {
    username: 'room_person',
    password: 'room123',
    role: 'room_person',
    name: 'Room Person',
    description: 'Basic access for room-level operations'
  }
};
