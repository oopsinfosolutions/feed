import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl
} from 'react-native';
import { TextInput, Button, Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
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
  
  // States for toggle functionality
  const [activeTab, setActiveTab] = useState('add');
  const [detailsList, setDetailsList] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  // Load details when switching to view tab
  useEffect(() => {
    if (activeTab === 'view') {
      fetchDetails();
    }
  }, [activeTab]);

  const fetchDetails = async () => {
    try {
      setLoadingDetails(true);
      console.log('🔍 Fetching office employee details...');
      
      const response = await axios.get('http://192.168.1.22:3000/view_details', {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ Response received:', response.status);
      console.log('📊 Raw response data:', response.data);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        // Data is already filtered by role: 'office' on the server side
        const officeData = response.data.data;
        
        console.log('✅ Office employee records found:', officeData.length);
        console.log('📋 Sample record:', officeData[0]);
        
        setDetailsList(officeData);
      } else {
        console.warn('⚠️ Unexpected response format:', response.data);
        setDetailsList([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching office details:', error);
      
      let errorMessage = 'Failed to load details';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Service not found. Please check if the server is running.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (!error.response && error.request) {
        errorMessage = 'Cannot connect to server. Please check your network connection.';
      }
      
      Alert.alert('Error Loading Details', errorMessage);
      setDetailsList([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDetails();
    setRefreshing(false);
  };

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
      const detailsData = {
        name: customerName.trim(),
        phone: phoneNumber.trim(),
        address: address.trim(),
        detail: product.trim(),
        // userId will be auto-generated by the server if not provided
      };

      console.log('📤 Submitting office employee data:', detailsData);

      const response = await axios.post('http://192.168.1.22:3000/add_details', detailsData, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('✅ Server response:', response.data);

      if (response.data?.success) {
        Alert.alert(
          'Success', 
          'Material request has been submitted successfully!',
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
              text: 'View Details',
              onPress: () => {
                setActiveTab('view');
              }
            },
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to submit material request');
      }

    } catch (error) {
      console.error('❌ Submit error:', error);
      
      let errorMessage = 'Failed to submit material request';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid request data';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (!error.response && error.request) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      }
      
      Alert.alert('Submission Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDetail = async (id) => {
    Alert.alert(
      'Delete Material Request',
      'Are you sure you want to delete this material request?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Note: You'll need to implement the delete endpoint on the server
              // For now, using a generic delete endpoint
              const response = await axios.delete(`http://192.168.1.22:3000/material/${id}`, {
                timeout: 10000,
              });
              
              if (response.data?.success) {
                Alert.alert('Success', 'Material request deleted successfully');
                fetchDetails(); // Refresh the list
              } else {
                Alert.alert('Error', response.data?.message || 'Failed to delete material request');
              }
            } catch (error) {
              console.error('❌ Delete error:', error);
              
              let errorMessage = 'Failed to delete material request';
              if (error.response?.status === 404) {
                errorMessage = 'Material request not found or already deleted';
              } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              }
              
              Alert.alert('Delete Error', errorMessage);
            }
          },
        },
      ]
    );
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

  const renderDetailItem = ({ item, index }) => {
    return (
      <Card style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailHeader}>
            <Text style={styles.detailIndex}>#{index + 1}</Text>
            <View style={styles.headerRight}>
              <Text style={styles.recordType}>Office</Text>
              <Text style={[styles.statusBadge, styles[`status_${item.status}`]]}>
                {item.status?.replace('_', ' ').toUpperCase() || 'SUBMITTED'}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteDetail(item.id)}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.detailContent}>
            {item.userId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ID:</Text>
                <Text style={styles.detailValue}>{item.userId}</Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{item.name || 'N/A'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{item.phone || 'N/A'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue}>{item.address || 'N/A'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Details:</Text>
              <Text style={styles.detailValue}>{item.detail || 'N/A'}</Text>
            </View>
            
            {item.createdAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Submitted:</Text>
                <Text style={styles.detailValueSmall}>
                  {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'add' && styles.activeTab]}
        onPress={() => setActiveTab('add')}
      >
        <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>
          Add Request
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'view' && styles.activeTab]}
        onPress={() => setActiveTab('view')}
      >
        <Text style={[styles.tabText, activeTab === 'view' && styles.activeTabText]}>
          View Requests ({detailsList.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAddForm = () => (
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
              label="Material Details"
              value={product}
              onChangeText={setProduct}
              mode="outlined"
              style={styles.textArea}
              outlineColor="#E0E7FF"
              activeOutlineColor="#6366F1"
              left={<TextInput.Icon icon="package-variant-closed" color="#6366F1" />}
              placeholder="Enter material specifications and requirements"
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
                <Text style={styles.buttonText}>Submitting Request...</Text>
              ) : (
                <>
                  <Text style={styles.buttonText}>Submit Request</Text>
                  <Text style={styles.buttonIcon}>+</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Animated.View>
  );

  const renderHeader = () => (
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
        <Text style={styles.subtitle}>Material Request Portal</Text>
      </View>
      
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Office Employee Portal • Material Request System</Text>
    </View>
  );

  const renderContent = () => {
    if (activeTab === 'add') {
      return (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View>
              {renderHeader()}
              {renderTabButtons()}
              {renderAddForm()}
              {renderFooter()}
            </View>
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContainer}
        />
      );
    } else {
      return (
        <FlatList
          data={detailsList}
          renderItem={renderDetailItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          ListHeaderComponent={
            <View>
              {renderHeader()}
              {renderTabButtons()}
              {loadingDetails && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6366F1" />
                  <Text style={styles.loadingText}>Loading material requests...</Text>
                </View>
              )}
            </View>
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !loadingDetails ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>📋</Text>
                <Text style={styles.emptyTitle}>No Material Requests Found</Text>
                <Text style={styles.emptySubtitle}>
                  Submit material requests to see them here
                </Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
          contentContainerStyle={[
            styles.scrollContainer,
            detailsList.length === 0 && !loadingDetails && { flex: 1 }
          ]}
        />
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.backgroundGradient} />
        {renderContent()}
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
  headerButtons: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    position: 'absolute',
    top: 16,
    right: 16,
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
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  detailIndex: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textAlign: 'center',
  },
  status_submitted_by_office: {
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
  },
  status_approved: {
    color: '#059669',
    backgroundColor: '#D1FAE5',
  },
  status_rejected: {
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  status_pending: {
    color: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: '700',
  },
  detailContent: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    width: 80,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
    fontWeight: '500',
  },
  detailValueSmall: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 1,
  },
});

export default OfficeEmployeeScreen;