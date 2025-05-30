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
  const [email, setEmail] = useState('');
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://192.168.1.7:3000/login', {
        email: email.toLowerCase().trim(),
        password,
      });

      if (response.data.error) {
        Alert.alert('Login Failed', response.data.error);
      } else {
        const { type, id } = response.data;

        // Save user_id and user_type in AsyncStorage
        await AsyncStorage.setItem('user_id', String(id));
        await AsyncStorage.setItem('user_type', type);
        await AsyncStorage.setItem('user_email', email.toLowerCase().trim());

        // Show success message
        Alert.alert('Success', 'Login successful!', [
          {
            text: 'OK',
            onPress: () => {
              // Navigate based on user type
              switch (type) {
                case 'Dealer':
                  navigation.navigate('DealerScreen', { customerId: id });
                  break;
                case 'Client':
                  navigation.navigate('CustomerScreen', { customerId: id });
                  break;
                case 'Employee':
                  navigation.navigate('EmployeeScreen', { customerId: id });
                  break;
                case 'admin':
                  navigation.navigate('AdminScreen', { customerId: id });
                  break;
                default:
                  Alert.alert('Error', 'Unknown user role');
              }
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        Alert.alert('Login Failed', error.response.data?.error || 'Server error occurred');
      } else if (error.request) {
        Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
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
          {/* Background Gradient Effect */}
          <View style={styles.backgroundGradient} />
          
          {/* Animated Login Container */}
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
                <Text style={styles.logoText}>🚚</Text>
              </View>
              <Title style={styles.title}>Welcome Back</Title>
              <Text style={styles.subtitle}>Sign in to continue to your account</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <TextInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#E0E7FF"
                  activeOutlineColor="#6366F1"
                  left={<TextInput.Icon icon="email-outline" color="#6366F1" />}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
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

              {/* Forgot Password Link */}
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
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

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Sign Up Link */}
              <TouchableOpacity
                style={styles.signupButton}
                onPress={() => navigation.navigate('Signup')}
                activeOpacity={0.7}
              >
                <Text style={styles.signupButtonText}>
                  Don't have an account? <Text style={styles.signupButtonTextBold}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer */}
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