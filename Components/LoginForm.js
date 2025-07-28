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
      'employee': 'EmployeeScreen',
      'field_employee': 'EmployeeScreen',
      'field-employee': 'EmployeeScreen',
      'fieldemployee': 'EmployeeScreen',
      'officeemp': 'OfficeEmployeeScreen',
      'office_employee': 'OfficeEmployeeScreen',
      'office-employee': 'OfficeEmployeeScreen',
      'officeemployee': 'OfficeEmployeeScreen',
      'office': 'OfficeEmployeeScreen',
      'sale_parchase': 'SalesPurchaseScreen',
      'sale_purchase': 'SalesPurchaseScreen',
      'sales_purchase': 'SalesPurchaseScreen'
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
      
      console.log('Sending login request with:', { phone: phoneToSend, password });
      
      const response = await axios.post('http://192.168.1.22:3000/login', {
        phone: phoneToSend,
        password,
      });

      console.log('Login response:', response.data);
  
      if (response.data.error) {
        Alert.alert('Login Failed', response.data.error);
      } else {
        // Extract user data from response
        const { type, id, fullname, isApproved, status } = response.data;
        
        console.log('User type received from server:', type);
        console.log('User ID received:', id);
        console.log('Full name received:', fullname);
        console.log('Is approved:', isApproved);
        console.log('Status:', status);

        // Define employee types that need approval
        const employeeTypes = ['employee', 'officeemp', 'sale_parchase'];
        const normalizedType = type.toLowerCase().trim();
        
        // Only check approval status for employee types
        if (employeeTypes.includes(normalizedType) && (!isApproved || status === 'pending')) {
          Alert.alert(
            'Access Denied', 
            'Your account is pending approval from the admin. Please wait for approval before logging in.',
            [
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
  
          Alert.alert('Success', 'Login successful!', [
            {
              text: 'OK',
              onPress: () => {
                // Use the improved navigation function
                navigateToUserScreen(type, id);
              }
            }
          ]);
        } catch (storageError) {
          console.error('AsyncStorage error:', storageError);
          Alert.alert('Storage Error', 'Failed to save login data. Please try again.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        const errorMessage = error.response.data?.error;
        
        if (errorMessage && errorMessage.includes('approval pending')) {
          Alert.alert(
            'Account Pending', 
            'Your account is still pending approval from the admin. Please contact support if this persists.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setPhone('');
                  setPassword('');
                }
              }
            ]
          );
        } else if (errorMessage && errorMessage.includes('Invalid credentials')) {
          Alert.alert('Login Failed', 'Invalid phone number or password. Please try again.');
        } else {
          Alert.alert('Login Failed', errorMessage || 'Server error occurred');
        }
      } else if (error.request) {
        console.error('Network error:', error.request);
        Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        console.error('Request error:', error.message);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (text) => {
    // Allow any digits, not just numbers starting with 6-9
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setPhone(cleaned);
    }
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
              </View>

              <View style={styles.inputContainer}>
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

              <TouchableOpacity style={styles.forgotPassword}>
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
                    <Text style={styles.buttonText}>Logging in...</Text>
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

              {/* Info notice */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  💡 Note: Employee accounts require admin approval before login access.
                </Text>
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
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
  },
  infoText: {
    color: '#4F46E5',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
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