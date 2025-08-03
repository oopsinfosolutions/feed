export const API_CONFIG = {
  BASE_URL: 'http://192.168.29.161:3000',
  TIMEOUT: 30000, // Increased timeout for production
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  LOGOUT: '/api/auth/logout',
  PROFILE: '/api/auth/profile',
  
  // Admin endpoints
  ADMIN_DASHBOARD: '/api/admin/dashboard',
  ADMIN_DASHBOARD_OVERVIEW: '/api/admin/dashboard-overview',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_APPROVE_USER: '/api/admin/approve-user',
  ADMIN_REJECT_USER: '/api/admin/reject-user',
  ADMIN_FEEDBACK: '/api/admin/feedback',
  ADMIN_FEEDBACK_RESPOND: '/api/admin/feedback/:id/respond',
  ADMIN_FEEDBACK_STATS: '/api/admin/feedback/stats',
  
  // Bills endpoints
  BILLS_ADMIN: '/api/bills/admin',
  BILLS_CREATE: '/api/bills',
  BILLS_STATS: '/api/bills/stats/overview',
  BILLS_PAYMENT_UPDATE: '/api/bills/:id/payment',
  
  // Client endpoints
  CLIENT_BILLS: '/api/client/bills',
  CLIENT_BILL_DETAILS: '/api/client/bill',
  CLIENT_FEEDBACK: '/api/client/feedback',
  
  // Feedback endpoints
  FEEDBACK: '/api/feedback',
  FEEDBACK_ADMIN: '/api/feedback/admin',
  FEEDBACK_RESPOND: '/api/feedback/:id/respond',
  
  // Other endpoints
  ORDERS: '/api/orders',
  MATERIALS: '/api/materials/getdata',
  SUBMIT_MATERIAL: '/api/materials/submit',
  USERS: '/api/users',
  SALES_CUSTOMERS: '/api/sales/customers',
  SALES_ORDERS: '/api/sales/orders',
  
  // Health check
  HEALTH: '/health',
  API_HEALTH: '/api/health',
  HEALTH_DETAILED: '/api/health/detailed',
};

// Enhanced API utility functions
export const apiUtils = {
  // Retry mechanism for failed requests
  async fetchWithRetry(url, options = {}, retries = API_CONFIG.RETRY_ATTEMPTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...API_CONFIG.HEADERS,
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      
      return response;
    } catch (error) {
      if (retries > 0 && error.name !== 'AbortError') {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  },

  // Build URL with base URL
  buildUrl(endpoint, params = {}) {
    let url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    // Replace path parameters
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    });
    
    return url;
  },

  // Get auth headers
  getAuthHeaders(token) {
    return {
      ...API_CONFIG.HEADERS,
      'Authorization': `Bearer ${token}`
    };
  }
};

export default API_CONFIG;