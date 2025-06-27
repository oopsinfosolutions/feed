import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import { TextInput, Button, Card, Title, Paragraph } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const OfficeEmployeeScreen = ({ navigation, route }) => {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [product, setProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return false;
    }
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    const phoneRegex = /^\d{10}$/;
    
    return phoneRegex.test(cleaned);
  };

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setPhoneNumber(cleaned);
    }
  };

  const validateForm = () => {
    if (!customerName.trim()) {
      Alert.alert('Validation Error', 'Please enter customer name.');
      return false;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number.');
      return false;
    }

    if (!address.trim()) {
      Alert.alert('Validation Error', 'Please enter customer address.');
      return false;
    }

    if (!product.trim()) {
      Alert.alert('Validation Error', 'Please enter product details.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get current user data from AsyncStorage
      const userId = await AsyncStorage.getItem('user_id');
      const userName = await AsyncStorage.getItem('user_name');

      const customerData = {
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        product: product.trim(),
        createdBy: userId,
        createdByName: userName,
        timestamp: new Date().toISOString(),
      };

      console.log('Submitting customer data:', customerData);

      // Replace with your actual API endpoint
      const response = await axios.post('http://192.168.1.15:3000/add-customer-request', customerData);

      console.log('Server response:', response.data);

      Alert.alert(
        'Success', 
        'Customer request has been added successfully!',
        [
          {
            text: 'Add Another',
            onPress: () => {
              setCustomerName('');
              setPhoneNumber('');
              setAddress('');
              setProduct('');
            }
          },
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );

    } catch (error) {
      console.error('Submit error:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        Alert.alert('Error', error.response.data?.message || 'Server error occurred');
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

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['user_id', 'user_type', 'user_phone', 'user_name']);
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
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
              styles.headerCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>🏢</Text>
              </View>
              <Title style={styles.title}>Office Employee</Title>
              <Text style={styles.subtitle}>Add Customer Request</Text>
            </View>
            
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View 
            style={[
              styles.formCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Card.Content>
              <View style={styles.formSection}>
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Customer Name"
                    value={customerName}
                    onChangeText={setCustomerName}
                    mode="outlined"
                    style={styles.input}
                    outlineColor="#E0E7FF"
                    activeOutlineColor="#6366F1"
                    left={<TextInput.Icon icon="account-outline" color="#6366F1" />}
                    placeholder="Enter customer full name"
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
                    label="Phone Number"
                    value={phoneNumber}
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
                    label="Address"
                    value={address}
                    onChangeText={setAddress}
                    mode="outlined"
                    style={styles.textArea}
                    outlineColor="#E0E7FF"
                    activeOutlineColor="#6366F1"
                    left={<TextInput.Icon icon="map-marker-outline" color="#6366F1" />}
                    placeholder="Enter complete address"
                    multiline={true}
                    numberOfLines={3}
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
                    label="Product Details"
                    value={product}
                    onChangeText={setProduct}
                    mode="outlined"
                    style={styles.textArea}
                    outlineColor="#E0E7FF"
                    activeOutlineColor="#6366F1"
                    left={<TextInput.Icon icon="package-variant-closed" color="#6366F1" />}
                    placeholder="Enter product specifications and requirements"
                    multiline={true}
                    numberOfLines={4}
                    theme={{
                      colors: {
                        primary: '#6366F1',
                        placeholder: '#9CA3AF',
                      }
                    }}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <View style={styles.buttonContent}>
                    {loading ? (
                      <Text style={styles.buttonText}>Adding Request...</Text>
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Add Customer Request</Text>
                        <Text style={styles.buttonIcon}>+</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Efficient • Organized • Professional</Text>
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
    height: height * 0.3,
    backgroundColor: '#6366F1',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    opacity: 0.1,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  logoText: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 20,
  },
  formSection: {
    width: '100%',
    paddingTop: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    height: 56,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    minHeight: 80,
  },
  submitButton: {
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
  submitButtonDisabled: {
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
    fontSize: 20,
    fontWeight: '700',
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

export default OfficeEmployeeScreen;