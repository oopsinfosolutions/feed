// config/ApiConfig.js -
export const API_CONFIG = {
  // CRITICAL: Replace this IP with your computer's actual IP address
  BASE_URL: 'http://192.168.29.161:3000', // ← UPDATE THIS IP ADDRESS
  TIMEOUT: 15000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  
  // Client endpoints
  CLIENT_BILLS: '/api/client/bills',
  CLIENT_BILL_DETAILS: '/api/client/bill',
  
  // Order endpoints
  ORDERS: '/api/orders',
  ADMIN_ORDERS: '/api/orders/admin',
  
  // Materials endpoints
  MATERIALS: '/api/materials/getdata',
  SUBMIT_MATERIAL: '/api/materials/submit',
  
  // User endpoints
  USERS: '/api/users',
  
  // Admin endpoints
  ADMIN_DASHBOARD: '/api/admin/dashboard',
  
  // Sales endpoints
  SALES_CUSTOMERS: '/api/sales/customers',
  SALES_ORDERS: '/api/sales/orders',
  
  // Feedback endpoints
  FEEDBACK: '/api/feedback',
  
  // Health check
  HEALTH: '/health',
};

export default API_CONFIG;