// config/ApiConfig.js - Compatible with your LoginForm

export const API_CONFIG = {
  BASE_URL: 'http://192.168.29.161:3000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// Simple flat structure that works with your existing LoginForm
export const API_ENDPOINTS = {
  // Auth endpoints (flat structure for compatibility)
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  LOGOUT: '/api/auth/logout',
  PROFILE: '/api/auth/profile',
  HEALTH: '/health',
  
  // Keep your nested structure too for other components
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    CHANGE_PASSWORD: '/api/auth/change-password',
    STATUS: '/api/auth/status',
  },
  
  UTILS: {
    HEALTH: '/health',
    VERSION: '/api/utils/version',
    CONFIG: '/api/utils/config',
  },
  
  // Admin endpoints
  ADMIN_DASHBOARD: '/api/admin/dashboard',
  ADMIN_DASHBOARD_OVERVIEW: '/api/admin/dashboard-overview',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_APPROVE_USER: '/api/admin/approve-user',
  ADMIN_REJECT_USER: '/api/admin/reject-user',
  ADMIN_FEEDBACK: '/api/admin/feedback',
  
  // Bills endpoints
  BILLS_ADMIN: '/api/bills/admin',
  BILLS_CREATE: '/api/bills',
  BILLS_STATS: '/api/bills/stats/overview',
  BILLS_PAYMENT_UPDATE: '/api/bills/:id/payment',
  
  // Client endpoints
  CLIENT_BILLS: '/api/client/bills',
  CLIENT_BILL_DETAILS: '/api/client/bill',
  CLIENT_FEEDBACK: '/api/client/feedback',
  
  // Other endpoints
  ORDERS: '/api/orders',
  MATERIALS: '/api/materials/getdata',
  SUBMIT_MATERIAL: '/api/materials/submit',
  USERS: '/api/users',
  SALES_CUSTOMERS: '/api/sales/customers',
  SALES_ORDERS: '/api/sales/orders',
  
  // Feedback endpoints
  FEEDBACK: '/api/feedback',
  FEEDBACK_ADMIN: '/api/feedback/admin',
  FEEDBACK_RESPOND: '/api/feedback/:id/respond',
};

// API Helper functions
export const apiHelpers = {
  buildUrl: (endpoint, params = {}) => {
    let url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const queryParams = new URLSearchParams(params).toString();
    if (queryParams) {
      url += `?${queryParams}`;
    }
    return url;
  },
  
  getDefaultOptions: (method = 'GET', body = null) => {
    const options = {
      method,
      headers: { ...API_CONFIG.HEADERS },
      timeout: API_CONFIG.TIMEOUT,
    };
    
    if (body && method !== 'GET') {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    
    return options;
  }
};

// Test connection function
export const testConnection = async () => {
  try {
    console.log('Testing API connection...');
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.HEALTH}`);
    const data = await response.json();
    console.log('API connection successful:', data);
    return true;
  } catch (error) {
    console.error('API connection failed:', error.message);
    return false;
  }
};