import React, { useState } from 'react';
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
import { TextInput, Button, Title } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const LoginForm = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

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
  }, []);

  const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return false;
    }
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Accept any 10-digit number
    const phoneRegex = /^\d{10}$/;
    
    return phoneRegex.test(cleaned);
  };

  // Improved navigation function with better user type handling
  const navigateToUserScreen = (userType, userId) => {
    console.log('Original user type from server:', userType);
    console.log('User ID:', userId);
    
    // Normalize the user type for comparison
    const normalizedType = userType.toLowerCase().trim().replace(/\s+/g, '_');
    console.log('Normalized user type:', normalizedType);
    
    const navigationMap = {
      'admin': 'AdminScreen',
      'administrator': 'AdminScreen',
      'dealer': 'EmployeeDataScreen',
      'client': 'CustomerScreen',
      'customer': 'CustomerScreen',
      'field_employee': 'EmployeeScreen',
      'fieldemployee': 'EmployeeScreen',
      'field-employee': 'EmployeeScreen',
      'employee': 'EmployeeScreen',
      'officeemp': 'OfficeEmployeeScreen',
      'office_employee': 'OfficeEmployeeScreen',
      'office-employee': 'OfficeEmployeeScreen',
      'officeemployee': 'OfficeEmployeeScreen',
      'office': 'OfficeEmployeeScreen',
      'sale_parchase': 'SalePurchaseEmployeeScreen',
      'sale_purchase': 'SalePurchaseEmployeeScreen',
      'sales_purchase': 'SalePurchaseEmployeeScreen'

    };
    
    const screenName = navigationMap[normalizedType];
    
    if (screenName) {
      console.log(`Navigating to: ${screenName} with userId: ${userId}`);
      navigation.navigate(screenName, { customerId: userId });
    } else {
      console.log('Available navigation options:', Object.keys(navigationMap));
      Alert.alert(
        'Navigation Error', 
        `Unknown user role: "${userType}". Please contact support.\n\nReceived type: ${userType}\nNormalized: ${normalizedType}`
      );
    }
  };
  
  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Validation Error', 'Please enter both phone number and password.');
      return;
    }
  
    if (!validatePhoneNumber(phone)) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number.');
      return;
    }
  
    setLoading(true);
  
    try {
      // Send phone number exactly as typed in the field
      const phoneToSend = phone.trim();
      
      console.log('Sending login request with:', { phone: phoneToSend, password: '[HIDDEN]' });
      
      const response = await axios.post('http://192.168.1.22:3000/api/auth/login', {
        phone: phoneToSend,
        password,
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Login response:', response.data);
  
      if (response.data.error) {
        handleLoginError(response.data.error, response.data.accountStatus);
      } else if (response.data.success === false) {
        handleLoginError(response.data.error || 'Login failed', response.data.accountStatus);
      } else {
        // Extract user data from response
        const { id, fullname, phone, type, isApproved, status } = response.data.user;

        
        console.log('User type received from server:', type);
        console.log('User ID received:', id);
        console.log('Full name received:', fullname);
        console.log('Is approved:', isApproved);
        console.log('Status:', status);

        // Define employee types that need approval
        const employeeTypes = [
          'field_employee', 
          'office_employee', 
          'employee', 
          'officeemp', 
          'sale_parchase',
          'sale_purchase',
          'sales_purchase'
        ];
        const normalizedType = type.toLowerCase().trim().replace(/\s+/g, '_');
        
        // Only check approval status for employee types
        if (employeeTypes.includes(normalizedType)) {
          if (!isApproved || status === 'pending' || status === 'pending_approval') {
            Alert.alert(
              '⏳ Account Pending Approval', 
              'Your account is still pending approval from the admin.\n\n' +
              'Please wait for approval before logging in. You will be notified once your account is approved.',
              [
                {
                  text: 'Contact Support',
                  onPress: () => {
                    // You can implement contact support functionality here
                    Alert.alert('Contact Support', 'Please contact admin at: admin@company.com or call +91-9876543210');
                  }
                },
                {
                  text: 'OK',
                  onPress: () => {
                    setPhone('');
                    setPassword('');
                  }
                }
              ]
            );
            return;
          } else if (status === 'rejected') {
            Alert.alert(
              '❌ Account Rejected', 
              'Your account registration has been rejected by the admin.\n\n' +
              'Please contact support for more information or to reapply.',
              [
                {
                  text: 'Contact Support',
                  onPress: () => {
                    Alert.alert('Contact Support', 'Please contact admin at: admin@company.com or call +91-9876543210');
                  }
                },
                {
                  text: 'OK',
                  onPress: () => {
                    setPhone('');
                    setPassword('');
                  }
                }
              ]
            );
            return;
          } else if (status === 'suspended') {
            Alert.alert(
              '🚫 Account Suspended', 
              'Your account has been suspended.\n\n' +
              'Please contact admin for more information.',
              [
                {
                  text: 'Contact Support',
                  onPress: () => {
                    Alert.alert('Contact Support', 'Please contact admin at: admin@company.com or call +91-9876543210');
                  }
                },
                {
                  text: 'OK',
                  onPress: () => {
                    setPhone('');
                    setPassword('');
                  }
                }
              ]
            );
            return;
          }
        }
  
        try {
          // Store user data in AsyncStorage
          await AsyncStorage.setItem('user_id', String(id));
          await AsyncStorage.setItem('user_type', type);
          await AsyncStorage.setItem('user_phone', phoneToSend);
          await AsyncStorage.setItem('user_approved', String(isApproved));
          await AsyncStorage.setItem('user_status', status || 'approved');
          
          if (fullname) {
            await AsyncStorage.setItem('user_name', fullname);
          }
  
          Alert.alert(
            '✅ Login Successful', 
            `Welcome back, ${fullname || 'User'}!`,
            [
              {
                text: 'Continue',
                onPress: () => {
                  // Use the improved navigation function
                  navigateToUserScreen(type, id);
                }
              }
            ]
          );
        } catch (storageError) {
          console.error('AsyncStorage error:', storageError);
          Alert.alert('Storage Error', 'Failed to save login data. Please try again.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      handleNetworkError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginError = (errorMessage, accountStatus) => {
    console.error('Login error:', errorMessage, 'Status:', accountStatus);
    
    if (errorMessage.includes('approval pending') || errorMessage.includes('pending approval')) {
      Alert.alert(
        '⏳ Account Pending Approval', 
        'Your account is still pending approval from the admin. Please contact support if this persists.',
        [
          {
            text: 'Contact Support',
            onPress: () => {
              Alert.alert('Contact Support', 'Please contact admin at: admin@company.com or call +91-9876543210');
            }
          },
          {
            text: 'OK',
            onPress: () => {
              setPhone('');
              setPassword('');
            }
          }
        ]
      );
    } else if (errorMessage.includes('Invalid credentials') || errorMessage.includes('Invalid phone') || errorMessage.includes('Invalid password')) {
      Alert.alert(
        '❌ Login Failed', 
        'Invalid phone number or password. Please check your credentials and try again.',
        [
          {
            text: 'Forgot Password?',
            onPress: () => {
              Alert.alert('Password Recovery', 'Please contact admin to reset your password at: admin@company.com');
            }
          },
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
    } else if (errorMessage.includes('rejected')) {
      Alert.alert(
        '❌ Account Rejected', 
        'Your account has been rejected. Please contact admin for more information.',
        [
          {
            text: 'Contact Support',
            onPress: () => {
              Alert.alert('Contact Support', 'Please contact admin at: admin@company.com or call +91-9876543210');
            }
          },
          {
            text: 'OK',
            onPress: () => {
              setPhone('');
              setPassword('');
            }
          }
        ]
      );
    } else {
      Alert.alert('❌ Login Failed', errorMessage || 'An error occurred during login');
    }
  };

  const handleNetworkError = (error) => {
    if (error.code === 'ECONNABORTED') {
      Alert.alert(
        '⏱️ Connection Timeout', 
        'The request timed out. Please check your internet connection and try again.'
      );
    } else if (error.response) {
      console.error('Error response:', error.response.data);
      const errorMessage = error.response.data?.error;
      
      if (error.response.status === 403) {
        handleLoginError(errorMessage || 'Access denied', error.response.data?.accountStatus);
      } else if (error.response.status === 401) {
        handleLoginError(errorMessage || 'Invalid credentials');
      } else if (error.response.status >= 500) {
        Alert.alert('Server Error', 'Server is currently unavailable. Please try again later.');
      } else {
        Alert.alert('Error', errorMessage || 'Server error occurred');
      }
    } else if (error.request) {
      console.error('Network error:', error.request);
      Alert.alert(
        '🌐 Network Error', 
        'Unable to connect to server. Please check your internet connection and try again.'
      );
    } else {
      console.error('Request error:', error.message);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handlePhoneChange = (text) => {
    // Allow any digits, not just numbers starting with 6-9
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setPhone(cleaned);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Password Recovery',
      'To reset your password, please contact the administrator.',
      [
        {
          text: 'Call Support',
          onPress: () => {
            // You can implement calling functionality here
            Alert.alert('Contact Support', 'Please call: +91-9876543210');
          }
        },
        {
          text: 'Email Support',
          onPress: () => {
            Alert.alert('Contact Support', 'Please email: admin@company.com');
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const getPhonePreview = () => {
    if (phone.length === 0) return '';
    if (phone.length <= 10) {
      return `+91 ${phone}`;
    }
    return phone;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>🚚</Text>
              </View>
              <Title style={styles.title}>Welcome Back</Title>
              <Text style={styles.subtitle}>Sign in to continue to your account</Text>
            </View>

            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#E0E7FF"
                  activeOutlineColor="#6366F1"
                  left={<TextInput.Icon icon="phone-outline" color="#6366F1" />}
                  keyboardType="phone-pad"
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  theme={{
                    colors: {
                      primary: '#6366F1',
                      placeholder: '#9CA3AF',
                    }
                  }}
                />
                {phone.length > 0 && (
                  <Text style={styles.phonePreview}>
                    Preview: {getPhonePreview()}
                  </Text>
                )}
                {phone.length > 0 && phone.length < 10 && (
                  <Text style={styles.errorText}>
                    Please enter exactly 10 digits
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  outlineColor="#E0E7FF"
                  activeOutlineColor="#6366F1"
                  left={<TextInput.Icon icon="lock-outline" color="#6366F1" />}
                  right={
                    <TextInput.Icon 
                      icon={showPassword ? "eye-off" : "eye"}
                      color="#6366F1"
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  theme={{
                    colors: {
                      primary: '#6366F1',
                      placeholder: '#9CA3AF',
                    }
                  }}
                />
              </View>

              <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.buttonContent}>
                  {loading ? (
                    <>
                      <Text style={styles.buttonText}>Signing in...</Text>
                      <Text style={styles.buttonIcon}>⏳</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Sign In</Text>
                      <Text style={styles.buttonIcon}>→</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.signupButton}
                onPress={() => navigation.navigate('Signup')}
                activeOpacity={0.7}
              >
                <Text style={styles.signupButtonText}>
                  Don't have an account? <Text style={styles.signupButtonTextBold}>Sign Up</Text>
                </Text>
              </TouchableOpacity>

              {/* Enhanced Info Notice */}
              <View style={styles.infoContainer}>
                <Icon name="info" size={16} color="#6366F1" />
                <Text style={styles.infoText}>
                  💡 Employee accounts require admin approval. Contact support if you have login issues.
                </Text>
              </View>

              {/* Support Contact */}
              <View style={styles.supportContainer}>
                <Text style={styles.supportTitle}>Need Help?</Text>
                <View style={styles.supportButtons}>
                  <TouchableOpacity
                    style={styles.supportButton}
                    onPress={() => Alert.alert('Call Support', 'Please call: +91-9876543210')}
                  >
                    <Icon name="phone" size={16} color="#10B981" />
                    <Text style={styles.supportButtonText}>Call Support</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.supportButton}
                    onPress={() => Alert.alert('Email Support', 'Please email: admin@company.com')}
                  >
                    <Icon name="email" size={16} color="#10B981" />
                    <Text style={styles.supportButtonText}>Email Support</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Secure • Reliable • Fast</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
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
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
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
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#8B5CF6',
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