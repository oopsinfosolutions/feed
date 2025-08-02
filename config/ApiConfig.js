// config/ApiConfig.js - Create this file to centralize your API configuration
export const API_CONFIG = {
  // Update this IP to match your computer's current IP
  BASE_URL: 'http://192.168.29.161:3000',
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// Export for easy use throughout your app
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_CONFIG.BASE_URL}/api/auth/login`,
  SIGNUP: `${API_CONFIG.BASE_URL}/api/auth/signup`,
  
  // User endpoints  
  USERS: `${API_CONFIG.BASE_URL}/api/users`,
  
  // Material endpoints
  MATERIALS: `${API_CONFIG.BASE_URL}/api/materials/getdata`,
  SUBMIT_MATERIAL: `${API_CONFIG.BASE_URL}/api/materials/submit`,
  
  // Order endpoints
  ORDERS: `${API_CONFIG.BASE_URL}/api/orders`,
  ADMIN_ORDERS: `${API_CONFIG.BASE_URL}/api/orders/admin`,
  
  // Admin endpoints
  ADMIN_DASHBOARD: `${API_CONFIG.BASE_URL}/api/admin/dashboard`,
  ADMIN_USERS: `${API_CONFIG.BASE_URL}/api/admin/users`,
  ADMIN_APPROVAL_STATS: `${API_CONFIG.BASE_URL}/api/admin/approval-stats`,
  PENDING_APPROVALS: `${API_CONFIG.BASE_URL}/api/admin/pending-approvals`,
  
  // Sales endpoints
  SALES_CUSTOMERS: `${API_CONFIG.BASE_URL}/api/sales/customers`,
  SALES_ORDERS: `${API_CONFIG.BASE_URL}/api/sales/orders`,
  
  // Feedback endpoints
  FEEDBACK: `${API_CONFIG.BASE_URL}/api/feedback`,
  
  // Health check
  HEALTH: `${API_CONFIG.BASE_URL}/health`,
};

export default API_CONFIG;