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
  RefreshControl,
  Modal
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

  // Edit functionality states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    detail: ''
  });

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
      
      const response = await axios.get('http://192.168.29.161:3000/view_details', {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ Response received:', response.status);
      console.log('📊 Raw response data:', response.data);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        const officeData = response.data.data;
        console.log('✅ Office employee records found:', officeData.length);
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
      };

      console.log('📤 Submitting office employee data:', detailsData);

      const response = await axios.post('http://192.168.29.161:3000/add_details', detailsData, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('✅ Server response:', response.data);

      if (response.data?.success) {
        Alert.alert(
          'Success', 
          'Material request has been submitted successfully!'
        );

        // Clear form
        setCustomerName('');
        setPhoneNumber('');
        setAddress('');
        setProduct('');

        // Refresh details if on view tab
        if (activeTab === 'view') {
          await fetchDetails();
        }
      } else {
        const errorMsg = response.data?.message || 'Failed to submit material request';
        Alert.alert('Submission Failed', errorMsg);
      }

    } catch (error) {
      console.error('❌ Error submitting office employee data:', error);

      let errorMessage = 'Failed to submit material request';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (!error.response && error.request) {
        errorMessage = 'Cannot connect to server. Please check your network connection.';
      }

      Alert.alert('Submission Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userSession');
      navigation.navigate('LoginForm');
    } catch (error) {
      console.error('Error during logout:', error);
      navigation.navigate('LoginForm');
    }
  };

  // Edit functionality
  const handleEditPress = (item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || '',
      phone: item.phone || '',
      address: item.address || '',
      detail: item.detail || ''
    });
    setEditModalVisible(true);
  };

  const validateEditForm = () => {
    if (!editForm.name.trim()) {
      Alert.alert('Validation Error', 'Please enter customer name.');
      return false;
    }

    if (!validatePhoneNumber(editForm.phone)) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number.');
      return false;
    }

    if (!editForm.address.trim()) {
      Alert.alert('Validation Error', 'Please enter customer address.');
      return false;
    }

    if (!editForm.detail.trim()) {
      Alert.alert('Validation Error', 'Please enter product details.');
      return false;
    }

    return true;
  };

  const handleUpdateRequest = async () => {
    if (!validateEditForm()) {
      return;
    }

    try {
      setLoading(true);

      const updateData = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        detail: editForm.detail.trim(),
      };

      console.log('📤 Updating request:', { id: editingItem.id, ...updateData });

      const response = await axios.put(
        `http://192.168.29.161:3000/update_details/${editingItem.id}`, 
        updateData,
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('✅ Update response:', response.data);

      if (response.data?.success) {
        Alert.alert(
          'Success', 
          'Request has been updated successfully!'
        );

        setEditModalVisible(false);
        setEditingItem(null);
        await fetchDetails(); // Refresh the list
      } else {
        const errorMsg = response.data?.message || 'Failed to update request';
        Alert.alert('Update Failed', errorMsg);
      }

    } catch (error) {
      console.error('❌ Error updating request:', error);

      let errorMessage = 'Failed to update request';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (!error.response && error.request) {
        errorMessage = 'Cannot connect to server. Please check your network connection.';
      }

      Alert.alert('Update Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (item) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this request?',
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
              setLoadingDetails(true);

              const response = await axios.delete(
                `http://192.168.29.161:3000/delete_details/${item.id}`,
                {
                  timeout: 15000,
                  headers: {
                    'Content-Type': 'application/json',
                  }
                }
              );

              if (response.data?.success) {
                Alert.alert('Success', 'Request has been deleted successfully!');
                await fetchDetails(); // Refresh the list
              } else {
                const errorMsg = response.data?.message || 'Failed to delete request';
                Alert.alert('Delete Failed', errorMsg);
              }

            } catch (error) {
              console.error('❌ Error deleting request:', error);
              Alert.alert('Delete Error', 'Failed to delete request. Please try again.');
            } finally {
              setLoadingDetails(false);
            }
          },
        },
      ]
    );
  };

  const renderDetailItem = ({ item, index }) => (
    <Card style={styles.detailCard}>
      <Card.Content style={{ padding: 20 }}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailIndex}>#{index + 1}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.recordType}>OFFICE</Text>
            <Text style={[styles.statusBadge, styles.status_submitted_by_office]}>
              {item.status || 'Submitted'}
            </Text>
            {/* Edit Button */}
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => handleEditPress(item)}
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
            {/* Delete Button */}
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => handleDeleteRequest(item)}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.detailContent}>
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
          View Requests
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
      <Card.Content style={styles.formSection}>
        <View style={styles.inputContainer}>
          <TextInput
            label="Customer Name"
            value={customerName}
            onChangeText={setCustomerName}
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: '#6366F1' } }}
            disabled={loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            maxLength={10}
            placeholder="10-digit phone number"
            theme={{ colors: { primary: '#6366F1' } }}
            disabled={loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            label="Customer Address"
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: '#6366F1' } }}
            disabled={loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            label="Product Details"
            value={product}
            onChangeText={setProduct}
            mode="outlined"
            style={styles.textArea}
            multiline
            numberOfLines={4}
            theme={{ colors: { primary: '#6366F1' } }}
            disabled={loading}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
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
                <Text style={styles.emptyTitle}>No Requests Found</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't submitted any material requests yet.
                </Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        />
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {renderContent()}

        {/* Edit Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Request</Text>
                <TouchableOpacity 
                  onPress={() => setEditModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Customer Name"
                    value={editForm.name}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                    mode="outlined"
                    style={styles.input}
                    theme={{ colors: { primary: '#6366F1' } }}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    label="Phone Number"
                    value={editForm.phone}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/\D/g, '');
                      if (cleaned.length <= 10) {
                        setEditForm(prev => ({ ...prev, phone: cleaned }));
                      }
                    }}
                    mode="outlined"
                    style={styles.input}
                    keyboardType="numeric"
                    maxLength={10}
                    theme={{ colors: { primary: '#6366F1' } }}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    label="Customer Address"
                    value={editForm.address}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, address: text }))}
                    mode="outlined"
                    style={styles.input}
                    theme={{ colors: { primary: '#6366F1' } }}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    label="Product Details"
                    value={editForm.detail}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, detail: text }))}
                    mode="outlined"
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    theme={{ colors: { primary: '#6366F1' } }}
                  />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.updateButton, loading && styles.submitButtonDisabled]}
                  onPress={handleUpdateRequest}
                  disabled={loading}
                >
                  <Text style={styles.updateButtonText}>
                    {loading ? 'Updating...' : 'Update Request'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  headerCard: {
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  buttonContainer: {
    marginTop: 8,
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
  editButton: {
    backgroundColor: '#E0F2FE',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  editButtonText: {
    color: '#0EA5E9',
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 16,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  },
);

export default OfficeEmployeeScreen;