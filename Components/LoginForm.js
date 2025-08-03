import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  Alert, 
  TouchableOpacity, 
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { TextInput, Button, Title, ActivityIndicator } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import API configuration
import { API_CONFIG, API_ENDPOINTS } from '../config/ApiConfig';

const { width, height } = Dimensions.get('window');

const LoginForm = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Enhanced state for better UX
  const [connectionStatus, setConnectionStatus] = useState('unknown'); // 'unknown', 'connected', 'disconnected'
  const [phoneFormatted, setPhoneFormatted] = useState('');

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Check for existing login and load remembered data
    checkExistingLogin();
    loadRememberedCredentials();
    testInitialConnection();
  }, []);

  const checkExistingLogin = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const userType = await AsyncStorage.getItem('user_type');
      
      if (userId && userType) {
        console.log('Found existing login data - showing options');
        // Instead of auto-navigating, show an alert to let user choose
        Alert.alert(
          'Welcome Back!',
          `You're already logged in as ${userType}. Would you like to continue or login with a different account?`,
          [
            {
              text: 'Login Different',
              onPress: async () => {
                // Clear stored credentials to allow fresh login
                await AsyncStorage.multiRemove([
                  'user_id', 'user_type', 'user_name', 'user_phone', 
                  'user_email', 'authToken', 'userStatus', 'isApproved', 'loginTime'
                ]);
                console.log('Cleared existing login data for fresh login');
              },
              style: 'default'
            },
            {
              text: 'Continue',
              onPress: () => {
                console.log('User chose to continue with existing login');
                navigateToUserScreen(userType, userId);
              },
              style: 'default'
            }
          ]
        );
      }
    } catch (error) {
      console.log('No existing login found');
    }
  };

  const loadRememberedCredentials = async () => {
    try {
      const rememberedPhone = await AsyncStorage.getItem('rememberedPhone');
      const isRemembered = await AsyncStorage.getItem('rememberMe');
      
      if (rememberedPhone && isRemembered === 'true') {
        setPhone(rememberedPhone);
        setRememberMe(true);
        formatPhoneDisplay(rememberedPhone);
      }
    } catch (error) {
      console.log('No remembered credentials found');
    }
  };

  const testInitialConnection = async () => {
    try {
      // Use the correct health endpoint
      const healthUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.HEALTH}`;
      const response = await axios.get(healthUrl, { timeout: 5000 });
      setConnectionStatus(response.status === 200 ? 'connected' : 'disconnected');
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const formatPhoneDisplay = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      const formatted = `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
      setPhoneFormatted(formatted);
    } else {
      setPhoneFormatted('');
    }
  };

  const handlePhoneChange = (value) => {
    // Allow only digits and limit to 10
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setPhone(cleaned);
      formatPhoneDisplay(cleaned);
    }
  };

  const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return false;
    }
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    const phoneRegex = /^\d{10}$/;
    
    return phoneRegex.test(cleaned);
  };

  const validateForm = () => {
    if (!validatePhoneNumber(phone)) {
      Alert.alert(
        'Invalid Phone Number', 
        'Please enter a valid 10-digit phone number'
      );
      return false;
    }

    if (!password || password.trim().length < 3) {
      Alert.alert(
        'Invalid Password', 
        'Password must be at least 3 characters long'
      );
      return false;
    }

    return true;
  };

  const handleRememberMe = async (phoneNumber) => {
    try {
      if (rememberMe) {
        await AsyncStorage.setItem('rememberedPhone', phoneNumber);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('rememberedPhone');
        await AsyncStorage.removeItem('rememberMe');
      }
    } catch (error) {
      console.log('Error saving remember me preference:', error);
    }
  };

  const navigateToUserScreen = (userType, userId) => {
    console.log('Original user type from server:', userType);
    console.log('User ID:', userId);
    
    // Normalize the user type for consistent matching
    const normalizedType = userType.toLowerCase().trim().replace(/[\s_-]+/g, '_');
    console.log('Normalized user type:', normalizedType);
    
    // Comprehensive navigation mapping with all possible variations
    const navigationMap = {
      // Admin variations
      'admin': 'AdminScreen',
      'administrator': 'AdminScreen',
      'admin_user': 'AdminScreen',
      
      // Customer/Client variations
      'client': 'CustomerScreen',
      'customer': 'CustomerScreen',
      'user': 'CustomerScreen',
      'buyer': 'CustomerScreen',
      
      // Field Employee variations
      'field_employee': 'EmployeeScreen',
      'fieldemployee': 'EmployeeScreen',
      'field-employee': 'EmployeeScreen',
      'employee': 'EmployeeScreen',
      'worker': 'EmployeeScreen',
      'field_worker': 'EmployeeScreen',
      
      // Office Employee variations
      'office_employee': 'OfficeEmployeeScreen',
      'officeemployee': 'OfficeEmployeeScreen',
      'office-employee': 'OfficeEmployeeScreen',
      'office': 'OfficeEmployeeScreen',
      'officeemp': 'OfficeEmployeeScreen',
      'office_emp': 'OfficeEmployeeScreen',
      'staff': 'OfficeEmployeeScreen',
      
      // Sales/Purchase Employee variations
      'sale_purchase': 'SalePurchaseEmployeeScreen',
      'sales_purchase': 'SalePurchaseEmployeeScreen',
      'sale_parchase': 'SalePurchaseEmployeeScreen', // Keep typo for backward compatibility
      'sales_&_purchase': 'SalePurchaseEmployeeScreen',
      'sales_and_purchase': 'SalePurchaseEmployeeScreen',
      'salesperson': 'SalePurchaseEmployeeScreen',
      'sales': 'SalePurchaseEmployeeScreen',
      'purchase': 'SalePurchaseEmployeeScreen',
      
      // Dealer variations
      'dealer': 'EmployeeDataScreen',
      'vendor': 'EmployeeDataScreen',
      'supplier': 'EmployeeDataScreen',
      'distributor': 'EmployeeDataScreen',
    };
    
    // Get the target screen
    let screenName = navigationMap[normalizedType];
    
    // Fallback logic if exact match not found
    if (!screenName) {
      console.log('Exact match not found, trying fallback logic...');
      
      // Check for partial matches
      if (normalizedType.includes('admin')) {
        screenName = 'AdminScreen';
      } else if (normalizedType.includes('employee') || normalizedType.includes('worker')) {
        if (normalizedType.includes('office')) {
          screenName = 'OfficeEmployeeScreen';
        } else if (normalizedType.includes('sale') || normalizedType.includes('purchase')) {
          screenName = 'SalePurchaseEmployeeScreen';
        } else {
          screenName = 'EmployeeScreen';
        }
      } else if (normalizedType.includes('client') || normalizedType.includes('customer')) {
        screenName = 'CustomerScreen';
      } else if (normalizedType.includes('dealer') || normalizedType.includes('vendor')) {
        screenName = 'EmployeeDataScreen';
      }
    }
    
    // Final fallback - default to customer screen for unknown types
    if (!screenName) {
      console.warn(`Unknown user type: "${userType}", defaulting to CustomerScreen`);
      screenName = 'CustomerScreen';
    }
    
    console.log(`Navigating to: ${screenName} with userId: ${userId}`);
    
    try {
      // Reset navigation stack to prevent back navigation to login
      navigation.reset({
        index: 0,
        routes: [{ 
          name: screenName, 
          params: { 
            customerId: userId,
            userId: userId,
            userType: userType,
            userRole: userType
          } 
        }],
      });
      
      console.log('Navigation successful');
    } catch (navigationError) {
      console.error('Navigation error:', navigationError);
      
      // Fallback navigation
      Alert.alert(
        'Navigation Error', 
        `Could not navigate to ${screenName}. Redirecting to default screen.`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'CustomerScreen', 
                  params: { 
                    customerId: userId,
                    userId: userId,
                    userType: userType,
                    userRole: userType
                  } 
                }],
              });
            }
          }
        ]
      );
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setConnectionStatus('unknown');
      
      // FIXED: Use the correct API endpoint
      const loginUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.LOGIN}`;
      console.log('🔄 Making login request to:', loginUrl);
      console.log('📱 Phone:', phone);
      
      const requestData = {
        phone: phone.trim(),
        password: password
      };

      console.log('📤 Request data:', { ...requestData, password: '***' });

      const response = await axios.post(loginUrl, requestData, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('✅ Login response status:', response.status);
      console.log('✅ Login response data:', response.data);

      setConnectionStatus('connected');

      if (response.data.success) {
        const { user, token } = response.data;
        console.log('👤 User data:', user);

        // Handle remember me
        await handleRememberMe(phone);

        // Store user data exactly as your CustomerScreen expects
        const userData = [
          ['user_id', user.id.toString()],
          ['user_type', user.type || 'Client'],
          ['user_name', user.fullname || user.name || 'User'],
          ['user_phone', user.phone || phone],
          ['user_email', user.email || ''],
          ['authToken', token || 'dummy-token'],
          ['userStatus', user.status || 'active'],
          ['isApproved', (user.isApproved !== false).toString()],
          ['loginTime', new Date().toISOString()]
        ];

        await AsyncStorage.multiSet(userData);
        console.log('💾 User data stored successfully');

        // Clear password but keep phone if remembered
        setPassword('');
        if (!rememberMe) {
          setPhone('');
          setPhoneFormatted('');
        }

        Alert.alert(
          'Login Successful! 🎉',
          `Welcome back, ${user.fullname || user.name || 'User'}!`,
          [
            {
              text: 'Continue',
              onPress: () => {
                navigateToUserScreen(user.type, user.id);
              }
            }
          ]
        );

      } else {
        setConnectionStatus('disconnected');
        console.log('❌ Login failed:', response.data.message);
        Alert.alert(
          'Login Failed',
          response.data.message || 'Invalid phone number or password. Please try again.'
        );
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      setConnectionStatus('disconnected');
      
      let errorTitle = 'Login Error';
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorTitle = 'Connection Timeout';
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorTitle = 'Network Error';
        errorMessage = 'Cannot connect to server. Please check:\n\n• Backend server is running\n• Phone and computer on same WiFi\n• Correct IP address in config\n• Firewall allows port 3000';
      } else if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
          case 400:
            errorTitle = 'Invalid Request';
            errorMessage = data?.message || 'Please check your phone number and password.';
            break;
          case 401:
            errorTitle = 'Authentication Failed';
            errorMessage = 'Invalid phone number or password. Please try again.';
            break;
          case 403:
            errorTitle = 'Account Not Approved';
            errorMessage = data?.message || 'Your account is pending approval. Please contact administrator.';
            break;
          case 404:
            errorTitle = 'Service Not Found';
            errorMessage = 'Login service is not available. Please contact support.';
            break;
          case 429:
            errorTitle = 'Too Many Attempts';
            errorMessage = 'Too many login attempts. Please wait a moment and try again.';
            break;
          case 500:
          case 502:
          case 503:
            errorTitle = 'Server Error';
            errorMessage = 'Server is temporarily unavailable. Please try again later.';
            break;
          default:
            errorMessage = data?.message || `Server error (${status}). Please try again.`;
            break;
        }
      } else if (error.request) {
        errorTitle = 'Network Error';
        errorMessage = 'Cannot reach the server. Please check your internet connection.';
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setConnectionStatus('unknown');
      
      // FIXED: Use the correct health endpoint
      const healthUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.HEALTH}`;
      console.log('🔍 Testing connection to:', healthUrl);
      
      // Show current config for debugging
      console.log('🔧 Current API Config:', {
        BASE_URL: API_CONFIG.BASE_URL,
        HEALTH_ENDPOINT: API_ENDPOINTS.HEALTH,
        LOGIN_ENDPOINT: API_ENDPOINTS.LOGIN,
        FULL_HEALTH_URL: healthUrl
      });
      
      const response = await axios.get(healthUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('🏥 Health check response:', response.data);
      setConnectionStatus('connected');
      
      Alert.alert(
        '✅ Connection Test Successful!',
        `Server is reachable at:\n${API_CONFIG.BASE_URL}\n\nServer Status: ${response.data.message || 'Running'}\n\nYou can now try logging in.`
      );
    } catch (error) {
      console.error('🔥 Connection test failed:', error);
      setConnectionStatus('disconnected');
      
      // Enhanced error debugging
      let errorDetails = `Error Type: ${error.constructor.name}\n`;
      errorDetails += `Error Code: ${error.code || 'Unknown'}\n`;
      errorDetails += `Error Message: ${error.message}\n`;
      
      if (error.response) {
        errorDetails += `Response Status: ${error.response.status}\n`;
        errorDetails += `Response Data: ${JSON.stringify(error.response.data)}\n`;
      }
      
      console.log('🔍 Detailed error info:', errorDetails);
      
      let errorMessage = `❌ Cannot reach server at:\n${API_CONFIG.BASE_URL}`;
      
      if (error.code === 'ECONNABORTED') {
        errorMessage += '\n\n⏱️ Connection timed out (10s)';
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errorMessage += '\n\n🌐 Network Error - Server unreachable';
      } else if (error.response) {
        errorMessage += `\n\n📡 Server responded with error (${error.response.status})`;
      } else {
        errorMessage += `\n\n🔍 ${error.message}`;
      }
      
      errorMessage += '\n\n🔧 Troubleshooting Steps:';
      errorMessage += '\n• Check if backend server is running';
      errorMessage += '\n• Verify IP address in ApiConfig.js';
      errorMessage += '\n• Ensure same WiFi network';
      errorMessage += '\n• Check firewall/antivirus settings';
      errorMessage += '\n• Try restarting Metro bundler';
      
      Alert.alert('❌ Connection Test Failed', errorMessage, [
        {
          text: 'Show Debug Info',
          onPress: () => {
            Alert.alert('Debug Information', errorDetails);
          }
        },
        {
          text: 'Network Setup Help',
          onPress: () => showNetworkSetupHelp()
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const showNetworkSetupHelp = () => {
    Alert.alert(
      '🔧 Network Setup Guide',
      '1. BACKEND SERVER:\n' +
      '   • Start your Node.js server: npm start\n' +
      '   • Check server logs for errors\n' +
      '   • Verify server runs on correct port\n\n' +
      '2. IP ADDRESS:\n' +
      '   • Use computer\'s local IP (not localhost)\n' +
      '   • Windows: ipconfig\n' +
      '   • Mac/Linux: ifconfig\n' +
      '   • Should look like: 192.168.x.x\n\n' +
      '3. FIREWALL:\n' +
      '   • Allow Node.js through firewall\n' +
      '   • Allow port 3000 (or your port)\n\n' +
      '4. WIFI:\n' +
      '   • Both devices on same network\n' +
      '   • No VPN or proxy blocking\n\n' +
      '5. CONFIG FILE:\n' +
      '   • Check ApiConfig.js has correct URL\n' +
      '   • Format: http://192.168.x.x:3000',
      [
        {
          text: 'Test Different URL',
          onPress: () => showCustomURLTest()
        },
        {
          text: 'OK'
        }
      ]
    );
  };

  const showCustomURLTest = () => {
    Alert.prompt(
      'Test Custom URL',
      'Enter server URL to test:\n(e.g., http://192.168.1.100:3000)',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Test',
          onPress: (url) => testCustomURL(url)
        }
      ],
      'plain-text',
      API_CONFIG.BASE_URL
    );
  };

  const testCustomURL = async (customUrl) => {
    if (!customUrl || !customUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Testing custom URL:', customUrl);
      
      const testUrl = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
      const healthUrl = `${testUrl}${API_ENDPOINTS.HEALTH}`;
      
      const response = await axios.get(healthUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      Alert.alert(
        '✅ Custom URL Test Successful!',
        `Server reachable at:\n${testUrl}\n\nUpdate your ApiConfig.js file with this URL to fix the connection.`
      );
      
    } catch (error) {
      Alert.alert(
        '❌ Custom URL Test Failed',
        `Cannot reach server at:\n${customUrl}\n\nError: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10B981';
      case 'disconnected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢 Connected';
      case 'disconnected': return '🔴 Disconnected';
      default: return '🟡 Unknown';
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Password Recovery',
      'To reset your password, please contact the administrator.',
      [
        {
          text: 'Contact Admin',
          onPress: () => {
            Alert.alert(
              'Contact Information',
              'Email: admin@company.com\nPhone: +91-9876543210\n\nPlease provide your registered phone number when contacting.'
            );
          }
        },
        { text: 'OK', style: 'cancel' }
      ]
    );
  };

  const clearStoredLoginData = async () => {
    try {
      Alert.alert(
        'Clear Stored Login',
        'This will clear all stored login data and remembered credentials. Are you sure?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Clear Data',
            onPress: async () => {
              await AsyncStorage.multiRemove([
                'user_id', 'user_type', 'user_name', 'user_phone', 
                'user_email', 'authToken', 'userStatus', 'isApproved', 
                'loginTime', 'rememberedPhone', 'rememberMe'
              ]);
              
              // Reset form state
              setPhone('');
              setPassword('');
              setPhoneFormatted('');
              setRememberMe(false);
              setConnectionStatus('unknown');
              
              Alert.alert(
                '✅ Data Cleared',
                'All stored login data has been cleared. You can now login with any account.'
              );
              
              console.log('All stored login data cleared successfully');
            },
            style: 'destructive'
          }
        ]
      );
    } catch (error) {
      console.error('Error clearing stored data:', error);
      Alert.alert('Error', 'Failed to clear stored data. Please try again.');
    }
  };

  const showCurrentConfig = () => {
    const configInfo = `📡 CURRENT API CONFIGURATION:

🔗 Base URL: ${API_CONFIG.BASE_URL}
🏥 Health Endpoint: ${API_ENDPOINTS.HEALTH}
🔑 Login Endpoint: ${API_ENDPOINTS.LOGIN}
⏱️ Timeout: ${API_CONFIG.TIMEOUT || 15000}ms

🌐 Full URLs:
• Health: ${API_CONFIG.BASE_URL}${API_ENDPOINTS.HEALTH}
• Login: ${API_CONFIG.BASE_URL}${API_ENDPOINTS.LOGIN}

📍 Connection Status: ${getConnectionStatusText()}

💡 TIP: If using localhost or 127.0.0.1, change to your computer's IP address (e.g., 192.168.1.100)`;

    Alert.alert('API Configuration', configInfo, [
      {
        text: 'Test Custom URL',
        onPress: () => showCustomURLTest()
      },
      {
        text: 'Copy Base URL',
        onPress: () => {
          // Note: Clipboard not available in this context, but we can show it
          Alert.alert('Base URL', API_CONFIG.BASE_URL);
        }
      },
      {
        text: 'OK'
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.backgroundGradient} />
          
          <Animated.View 
            style={[
              styles.loginCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>🏢</Text>
              </View>
              <Title style={styles.title}>Welcome Back</Title>
              <Text style={styles.subtitle}>
                Sign in to your account to continue
              </Text>
              <Text style={styles.serverInfo}>
                Server: {API_CONFIG.BASE_URL}
              </Text>
            </View>

            {/* Connection Status */}
            <View style={[styles.connectionStatus, { borderColor: getConnectionStatusColor() }]}>
              <Text style={[styles.connectionText, { color: getConnectionStatusColor() }]}>
                {getConnectionStatusText()}
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  mode="outlined"
                  placeholder="Enter 10-digit phone number"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={10}
                  left={<TextInput.Icon icon="phone" />}
                  theme={{
                    colors: {
                      primary: '#6366F1',
                      outline: '#E2E8F0',
                    }
                  }}
                />
                {phoneFormatted ? (
                  <Text style={styles.phonePreview}>{phoneFormatted}</Text>
                ) : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  mode="outlined"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon 
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  theme={{
                    colors: {
                      primary: '#6366F1',
                      outline: '#E2E8F0',
                    }
                  }}
                />
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.rememberContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <View style={styles.buttonContent}>
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.buttonText}>Signing In...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Sign In</Text>
                      <Text style={styles.buttonIcon}>→</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Test Connection Button */}
              <TouchableOpacity 
                style={[styles.testButton, loading && styles.loginButtonDisabled]}
                onPress={testConnection}
                disabled={loading}
              >
                <View style={styles.buttonContent}>
                  <Icon name="network-check" size={18} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Test Connection</Text>
                </View>
              </TouchableOpacity>

              {/* Clear Login Data Button */}
              <TouchableOpacity 
                style={[styles.clearDataButton, loading && styles.loginButtonDisabled]}
                onPress={clearStoredLoginData}
                disabled={loading}
              >
                <View style={styles.buttonContent}>
                  <Icon name="logout" size={18} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Clear Stored Login</Text>
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Signup Button */}
              <TouchableOpacity 
                style={styles.signupButton}
                onPress={() => navigation.navigate('Signup')}
              >
                <Text style={styles.signupButtonText}>
                  Don't have an account? <Text style={styles.signupButtonTextBold}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info Container */}
            <View style={styles.infoContainer}>
              <Icon name="info" size={16} color="#4F46E5" />
              <Text style={styles.infoText}>
                Having trouble connecting? Make sure your phone and computer are on the same WiFi network, and the backend server is running.
              </Text>
            </View>

            {/* Support Container */}
            <View style={styles.supportContainer}>
              <Text style={styles.supportTitle}>Need Help?</Text>
              <View style={styles.supportButtons}>
                <TouchableOpacity 
                  style={styles.supportButton}
                  onPress={() => showNetworkSetupHelp()}
                >
                  <Icon name="help" size={14} color="#10B981" />
                  <Text style={styles.supportButtonText}>Network Help</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.supportButton}
                  onPress={() => showCurrentConfig()}
                >
                  <Icon name="settings" size={14} color="#10B981" />
                  <Text style={styles.supportButtonText}>Show Config</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.supportButton}
                  onPress={() => Alert.alert('Contact Support', 'Please contact your system administrator for login issues.')}
                >
                  <Icon name="support-agent" size={14} color="#10B981" />
                  <Text style={styles.supportButtonText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              BHAI CHARA ENTERPRISE
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    minHeight: height,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    backgroundColor: '#6366F1',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    opacity: 0.1,
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 8,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#C7D2FE',
  },
  logoText: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
    marginBottom: 8,
  },
  serverInfo: {
    fontSize: 12,
    color: '#6366F1',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  connectionStatus: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formSection: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    height: 56,
  },
  phonePreview: {
    fontSize: 12,
    color: '#6366F1',
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  forgotPasswordText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  testButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  clearDataButton: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  buttonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  signupButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 16,
  },
  signupButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
  signupButtonTextBold: {
    color: '#6366F1',
    fontWeight: '700',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 16,
  },
  infoText: {
    color: '#4F46E5',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  supportContainer: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
    textAlign: 'center',
  },
  supportButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  supportButtonText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 20,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default LoginForm;