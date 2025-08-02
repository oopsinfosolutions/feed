// NetworkConfig.js - Create this file to centralize network configuration
import axios from 'axios';
import { Alert } from 'react-native';

// Network Configuration
const NETWORK_CONFIG = {
  // Try multiple server URLs (add your actual server IPs)
  SERVER_URLS: [
    'http://192.168.29.161:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.100:3000', // Add your computer's actual IP
    // Add your production URL here
    // 'https://your-production-domain.com'
  ],
  
  TIMEOUT: 30000, // Increased to 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds between retries
};

// Global axios configuration
const createAxiosInstance = () => {
  const instance = axios.create({
    timeout: NETWORK_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      console.log(`🔄 Making request to: ${config.url}`);
      return config;
    },
    (error) => {
      console.error('❌ Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      console.log(`✅ Response received from: ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error('❌ Response error:', error.message);
      return Promise.reject(error);
    }
  );

  return instance;
};

// Create axios instance
export const apiClient = createAxiosInstance();

// Function to test server connectivity
export const testServerConnectivity = async () => {
  for (const baseURL of NETWORK_CONFIG.SERVER_URLS) {
    try {
      console.log(`🔍 Testing connectivity to: ${baseURL}`);
      
      const response = await axios.get(`${baseURL}/health`, {
        timeout: 10000, // 10 second timeout for health checks
      });
      
      if (response.status === 200) {
        console.log(`✅ Server is reachable at: ${baseURL}`);
        return baseURL;
      }
    } catch (error) {
      console.log(`❌ Server not reachable at: ${baseURL} - ${error.message}`);
      continue;
    }
  }
  
  throw new Error('No servers are reachable');
};

// Function to make API requests with retry logic
export const makeAPIRequest = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    data = null,
    params = null,
    headers = {},
    retries = NETWORK_CONFIG.MAX_RETRIES,
  } = options;

  // First, find a working server
  let baseURL;
  try {
    baseURL = await testServerConnectivity();
  } catch (error) {
    throw new Error('Cannot connect to any server. Please check your network connection and ensure the server is running.');
  }

  // Now make the actual request with retries
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${retries} to ${method} ${baseURL}${endpoint}`);
      
      const config = {
        method,
        url: `${baseURL}${endpoint}`,
        timeout: NETWORK_CONFIG.TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (data) config.data = data;
      if (params) config.params = params;

      const response = await axios(config);
      
      console.log(`✅ Request successful on attempt ${attempt}`);
      return response;

    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, NETWORK_CONFIG.RETRY_DELAY));
    }
  }
};

// Enhanced error handling
export const handleAPIError = (error, context = 'Request') => {
  console.error(`${context} error:`, error);
  
  let errorMessage = 'An unexpected error occurred';
  let errorTitle = 'Error';
  
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    errorTitle = '⏱️ Connection Timeout';
    errorMessage = 'The request timed out. Please check your internet connection and try again.';
  } else if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
    errorTitle = '🌐 Network Error';
    errorMessage = 'Cannot connect to the server. Please check your network connection and ensure the server is running.';
  } else if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 400:
        errorTitle = 'Validation Error';
        errorMessage = data?.message || 'Invalid request data';
        break;
      case 401:
        errorTitle = 'Authentication Error';
        errorMessage = data?.message || 'Invalid credentials';
        break;
      case 403:
        errorTitle = 'Access Denied';
        errorMessage = data?.message || 'You do not have permission to perform this action';
        break;
      case 404:
        errorTitle = 'Not Found';
        errorMessage = data?.message || 'The requested resource was not found';
        break;
      case 429:
        errorTitle = 'Rate Limited';
        errorMessage = 'Too many requests. Please wait a moment and try again.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorTitle = 'Server Error';
        errorMessage = 'Server is temporarily unavailable. Please try again later.';
        break;
      default:
        errorTitle = 'Request Failed';
        errorMessage = data?.message || `Request failed with status ${status}`;
    }
  } else if (error.request) {
    errorTitle = '🌐 Network Error';
    errorMessage = 'Cannot reach the server. Please check your internet connection.';
  }
  
  return { errorTitle, errorMessage };
};

// Utility function to show error alerts
export const showErrorAlert = (error, context = 'Request') => {
  const { errorTitle, errorMessage } = handleAPIError(error, context);
  
  Alert.alert(errorTitle, errorMessage, [
    {
      text: 'OK',
      style: 'default',
    },
    {
      text: 'Retry',
      onPress: () => {
        // This should be handled by the calling component
        console.log('User wants to retry');
      },
    },
  ]);
};

// Export default configuration
export default {
  makeAPIRequest,
  handleAPIError,
  showErrorAlert,
  testServerConnectivity,
  apiClient,
  NETWORK_CONFIG,
};