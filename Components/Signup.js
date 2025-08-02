import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Menu, Divider, Button } from 'react-native-paper';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const Signup = ({ navigation }) => {
  const [fullname, setfullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('Select Role');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

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

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // Enhanced user types with proper categorization
  const userTypes = [
    { label: 'Client', value: 'Client', needsApproval: false, icon: '👤' },
    { label: 'Dealer', value: 'dealer', needsApproval: false, icon: '🏪' },
    { label: 'Field Employee', value: 'field_employee', needsApproval: true, icon: '🚚' },
    { label: 'Office Employee', value: 'office_employee', needsApproval: true, icon: '🏢' },
    { label: 'Sales & Purchase', value: 'sale_parchase', needsApproval: true, icon: '💼' }
  ];

  const selectedUserType = userTypes.find(ut => ut.value === type);
  const isEmployeeType = selectedUserType?.needsApproval || false;

  const validateForm = () => {
    // Basic validation
    if (!fullname.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }

    if (fullname.trim().length < 2) {
      Alert.alert('Validation Error', 'Full name must be at least 2 characters long');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    // Phone validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number');
      return false;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }

    // Role validation
    if (type === 'Select Role') {
      Alert.alert('Validation Error', 'Please select a role');
      return false;
    }

    // Employee-specific validation
    if (isEmployeeType) {
      if (!department.trim()) {
        Alert.alert('Validation Error', 'Department is required for employee roles');
        return false;
      }
      
      if (!employeeId.trim()) {
        Alert.alert('Validation Error', 'Employee ID is required for employee roles');
        return false;
      }

      if (employeeId.trim().length < 3) {
        Alert.alert('Validation Error', 'Employee ID must be at least 3 characters long');
        return false;
      }
    }

    return true;
  };

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setPhone(cleaned);
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const userData = {
        fullname: fullname.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.replace(/\D/g, ''),
        type
      };

      // Add employee-specific fields
      if (isEmployeeType) {
        userData.department = department.trim();
        userData.employeeId = employeeId.trim().toUpperCase();
      }

      console.log('Submitting user data:', { ...userData, password: '[HIDDEN]' });

      const response = await axios.post('http://192.168.29.161:3000/signup', userData, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Signup response:', response.data);

      if (response.data.success) {
        // Clear form
        setfullname('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setPhone('');
        setType('Select Role');
        setDepartment('');
        setEmployeeId('');

        if (response.data.requiresApproval) {
          // Employee registration requiring approval
          Alert.alert(
            '✅ Registration Submitted', 
            'Your registration has been submitted successfully!\n\n' +
            'Since you\'re registering as an employee, your account requires admin approval. ' +
            'You will receive a notification once your account has been reviewed and approved.\n\n' +
            'This process typically takes 1-2 business days.',
            [
              {
                text: 'Register Another Employee',
                onPress: () => {
                  // Form is already cleared
                }
              },
              {
                text: 'Go to Login',
                style: 'default',
                onPress: () => navigation.navigate('Login')
              }
            ]
          );
        } else {
          // Immediate access (Client/Dealer)
          Alert.alert(
            '🎉 Registration Successful', 
            'Your account has been created successfully! You can now login with your credentials.',
            [
              {
                text: 'Register Another User',
                onPress: () => {
                  // Form is already cleared
                }
              },
              {
                text: 'Login Now',
                style: 'default',
                onPress: () => navigation.navigate('Login')
              }
            ]
          );
        }
      } else {
        Alert.alert('Registration Error', response.data.message || 'Registration failed');
      }

    } catch (error) {
      console.error('Signup Error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response) {
        console.error('Server Error Response:', error.response.data);
        
        if (error.response.status === 409) {
          errorMessage = 'An account with this email or phone number already exists.';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.error || 'Please check your information and try again.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        console.error('Network Error:', error.request);
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        console.error('Request Error:', error.message);
      }
      
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectUserType = (userType) => {
    setType(userType.value);
    closeMenu();
    
    // Clear employee fields if switching to non-employee type
    if (!userType.needsApproval) {
      setDepartment('');
      setEmployeeId('');
    }
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, text: '', color: '#E5E7EB' };
    if (password.length < 4) return { strength: 1, text: 'Weak', color: '#EF4444' };
    if (password.length < 6) return { strength: 2, text: 'Fair', color: '#F59E0B' };
    if (password.length < 8) return { strength: 3, text: 'Good', color: '#10B981' };
    return { strength: 4, text: 'Strong', color: '#059669' };
  };

  const passwordStrength = getPasswordStrength(password);

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
              styles.signupCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>📝</Text>
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join our platform today</Text>
            </View>

            <View style={styles.formSection}>
              {/* Full Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="person" size={20} color="#6366F1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    value={fullname}
                    onChangeText={setfullname}
                    autoCapitalize="words"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="email" size={20} color="#6366F1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your email address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Phone Number Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="phone" size={20} color="#6366F1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                {phone.length > 0 && phone.length < 10 && (
                  <Text style={styles.errorText}>
                    Phone number must be exactly 10 digits
                  </Text>
                )}
              </View>

              {/* Role Selection */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Select Role *</Text>
                <Menu
                  visible={menuVisible}
                  onDismiss={closeMenu}
                  anchor={
                    <TouchableOpacity
                      style={[styles.roleSelector, type === 'Select Role' && styles.roleSelectorPlaceholder]}
                      onPress={openMenu}
                    >
                      <View style={styles.roleSelectorContent}>
                        {selectedUserType && (
                          <Text style={styles.roleIcon}>{selectedUserType.icon}</Text>
                        )}
                        <Text style={[
                          styles.roleSelectorText,
                          type === 'Select Role' && styles.placeholderText
                        ]}>
                          {selectedUserType ? selectedUserType.label : 'Select Role'}
                        </Text>
                        <Icon name="keyboard-arrow-down" size={24} color="#6366F1" />
                      </View>
                    </TouchableOpacity>
                  }
                  contentStyle={styles.menuContent}
                >
                  {userTypes.map((userType) => (
                    <React.Fragment key={userType.value}>
                      <Menu.Item 
                        onPress={() => selectUserType(userType)}
                        title={
                          <View style={styles.menuItem}>
                            <Text style={styles.menuIcon}>{userType.icon}</Text>
                            <View style={styles.menuTextContainer}>
                              <Text style={styles.menuTitle}>{userType.label}</Text>
                              {userType.needsApproval && (
                                <Text style={styles.menuSubtitle}>Requires approval</Text>
                              )}
                            </View>
                          </View>
                        }
                      />
                      <Divider />
                    </React.Fragment>
                  ))}
                </Menu>
                
                {isEmployeeType && (
                  <View style={styles.approvalNotice}>
                    <Icon name="info" size={16} color="#F59E0B" />
                    <Text style={styles.approvalNoticeText}>
                      Employee accounts require admin approval before login access
                    </Text>
                  </View>
                )}
              </View>

              {/* Employee-specific fields */}
              {isEmployeeType && (
                <View style={styles.employeeSection}>
                  <Text style={styles.sectionTitle}>Employee Information</Text>
                  
                  {/* Department Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Department *</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="business" size={20} color="#6366F1" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., Sales, Operations, Logistics"
                        value={department}
                        onChangeText={setDepartment}
                        autoCapitalize="words"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  {/* Employee ID Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Employee ID *</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="badge" size={20} color="#6366F1" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter your employee ID"
                        value={employeeId}
                        onChangeText={setEmployeeId}
                        autoCapitalize="characters"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="lock" size={20} color="#6366F1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Create a strong password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon 
                      name={showPassword ? "visibility" : "visibility-off"} 
                      size={20} 
                      color="#6366F1" 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <View style={styles.passwordStrengthContainer}>
                    <View style={styles.passwordStrengthBar}>
                      <View 
                        style={[
                          styles.passwordStrengthFill,
                          { 
                            width: `${(passwordStrength.strength / 4) * 100}%`,
                            backgroundColor: passwordStrength.color
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.text}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="lock" size={20} color="#6366F1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Icon 
                      name={showConfirmPassword ? "visibility" : "visibility-off"} 
                      size={20} 
                      color="#6366F1" 
                    />
                  </TouchableOpacity>
                </View>
                
                {confirmPassword.length > 0 && (
                  <View style={styles.passwordMatchContainer}>
                    <Icon 
                      name={password === confirmPassword ? "check-circle" : "error"} 
                      size={16} 
                      color={password === confirmPassword ? "#10B981" : "#EF4444"}
                    />
                    <Text style={[
                      styles.passwordMatchText,
                      { color: password === confirmPassword ? "#10B981" : "#EF4444" }
                    ]}>
                      {password === confirmPassword ? "Passwords match" : "Passwords don't match"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.buttonContent}>
                  {loading ? (
                    <>
                      <Text style={styles.buttonText}>Creating Account...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Create Account</Text>
                      <Icon name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Login Redirect */}
              <TouchableOpacity
                style={styles.loginRedirectButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginRedirectText}>
                  Already have an account? <Text style={styles.loginRedirectTextBold}>Login</Text>
                </Text>
              </TouchableOpacity>

              {/* Information Notice */}
              <View style={styles.infoContainer}>
                <Icon name="info" size={16} color="#6366F1" />
                <Text style={styles.infoText}>
                  By creating an account, you agree to our Terms of Service and Privacy Policy
                </Text>
              </View>
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Secure • Reliable • Professional</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
    padding: 20,
    paddingTop: 40,
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
  signupCard: {
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
    marginBottom: 20,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  roleSelector: {
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  roleSelectorPlaceholder: {
    borderColor: '#D1D5DB',
  },
  roleSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  roleSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  approvalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  approvalNoticeText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  employeeSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    flex: 1,
    marginRight: 12,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  passwordMatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  passwordMatchText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  signupButton: {
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
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  signupButtonDisabled: {
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
  loginRedirectButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginRedirectText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
  loginRedirectTextBold: {
    color: '#6366F1',
    fontWeight: '700',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoText: {
    color: '#4F46E5',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default Signup;