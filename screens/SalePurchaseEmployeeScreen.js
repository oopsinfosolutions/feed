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
  Modal,
  ScrollView
} from 'react-native';
import { TextInput, Button, Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SalesPurchaseEmployeeScreen = ({ navigation, route }) => {
  // Customer Data States
  const [customerData, setCustomerData] = useState({
    customerName: '',
    phoneNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    customerType: 'individual', // individual, business
    creditLimit: '',
    paymentTerms: '30', // days
    contactPerson: '',
    alternatePhone: '',
    website: '',
    businessCategory: '',
    notes: ''
  });

  // Product/Order States
  const [orderData, setOrderData] = useState({
    productName: '',
    productCategory: '',
    quantity: '',
    unit: 'pcs',
    unitPrice: '',
    discount: '0',
    totalAmount: '',
    orderType: 'sale', // sale, purchase
    priority: 'medium', // low, medium, high
    expectedDeliveryDate: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  
  // States for toggle functionality
  const [activeTab, setActiveTab] = useState('customer');
  const [customersList, setCustomersList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit functionality states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState(''); // 'customer' or 'order'

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

  // Load data when switching tabs
  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  // Calculate total amount when quantity, unit price, or discount changes
  useEffect(() => {
    calculateTotal();
  }, [orderData.quantity, orderData.unitPrice, orderData.discount]);

  const calculateTotal = () => {
    const quantity = parseFloat(orderData.quantity) || 0;
    const unitPrice = parseFloat(orderData.unitPrice) || 0;
    const discount = parseFloat(orderData.discount) || 0;
    
    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal - discountAmount;
    
    setOrderData(prev => ({
      ...prev,
      totalAmount: total.toFixed(2)
    }));
  };

  const fetchCustomers = async () => {
    try {
      setLoadingData(true);
      console.log('🔍 Fetching customers...');
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/sales/customers`, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ Customers response:', response.data);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        setCustomersList(response.data.data);
      } else {
        console.warn('⚠️ Unexpected response format:', response.data);
        setCustomersList([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      handleFetchError('customers', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingData(true);
      console.log('🔍 Fetching orders...');
      
      const response = await axios.get('http://192.168.29.161:3000/api/sales/orders', {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ Orders response:', response.data);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        setOrdersList(response.data.data);
      } else {
        console.warn('⚠️ Unexpected response format:', response.data);
        setOrdersList([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      handleFetchError('orders', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleFetchError = (dataType, error) => {
    let errorMessage = `Failed to load ${dataType}`;
    
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
    
    Alert.alert(`Error Loading ${dataType}`, errorMessage);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'customers') {
      await fetchCustomers();
    } else if (activeTab === 'orders') {
      await fetchOrders();
    }
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

  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return true; // Email is optional
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePincode = (pincode) => {
    if (!pincode || pincode.trim() === '') {
      return false;
    }
    const pincodeRegex = /^\d{6}$/;
    return pincodeRegex.test(pincode);
  };

  const validateCustomerForm = () => {
    if (!customerData.customerName.trim()) {
      Alert.alert('Validation Error', 'Please enter customer name.');
      return false;
    }

    if (!validatePhoneNumber(customerData.phoneNumber)) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number.');
      return false;
    }

    if (customerData.email && !validateEmail(customerData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return false;
    }

    if (!customerData.address.trim()) {
      Alert.alert('Validation Error', 'Please enter customer address.');
      return false;
    }

    if (!customerData.city.trim()) {
      Alert.alert('Validation Error', 'Please enter city.');
      return false;
    }

    if (!customerData.state.trim()) {
      Alert.alert('Validation Error', 'Please enter state.');
      return false;
    }

    if (!validatePincode(customerData.pincode)) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit pincode.');
      return false;
    }

    return true;
  };

  const validateOrderForm = () => {
    if (!orderData.productName.trim()) {
      Alert.alert('Validation Error', 'Please enter product name.');
      return false;
    }

    if (!orderData.quantity || parseFloat(orderData.quantity) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid quantity.');
      return false;
    }

    if (!orderData.unitPrice || parseFloat(orderData.unitPrice) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid unit price.');
      return false;
    }

    return true;
  };

  const handleCustomerSubmit = async () => {
    if (!validateCustomerForm()) {
      return;
    }

    setLoading(true);

    try {
      const customerPayload = {
        ...customerData,
        role: 'sales_purchase',
        type: 'customer_entry'
      };

      console.log('📤 Submitting customer data:', customerPayload);

      const response = await axios.post('http://192.168.29.161:3000/api/sales/customers', customerPayload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('✅ Customer submission response:', response.data);

      if (response.data?.success) {
        Alert.alert(
          'Success', 
          'Customer data has been saved successfully!'
        );

        // Clear form
        setCustomerData({
          customerName: '',
          phoneNumber: '',
          email: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          gstin: '',
          customerType: 'individual',
          creditLimit: '',
          paymentTerms: '30',
          contactPerson: '',
          alternatePhone: '',
          website: '',
          businessCategory: '',
          notes: ''
        });

        // Refresh customers list if on customers tab
        if (activeTab === 'customers') {
          await fetchCustomers();
        }
      } else {
        const errorMsg = response.data?.message || 'Failed to save customer data';
        Alert.alert('Submission Failed', errorMsg);
      }

    } catch (error) {
      console.error('❌ Error submitting customer data:', error);
      handleSubmissionError('customer data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = async () => {
    if (!validateOrderForm()) {
      return;
    }

    setLoading(true);

    try {
      const orderPayload = {
        ...orderData,
        role: 'sales_purchase',
        type: 'order_entry'
      };

      console.log('📤 Submitting order data:', orderPayload);

      const response = await axios.post('http://192.168.29.161:3000/api/sales/orders', orderPayload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('✅ Order submission response:', response.data);

      if (response.data?.success) {
        Alert.alert(
          'Success', 
          'Order has been created successfully!'
        );

        // Clear form
        setOrderData({
          productName: '',
          productCategory: '',
          quantity: '',
          unit: 'pcs',
          unitPrice: '',
          discount: '0',
          totalAmount: '',
          orderType: 'sale',
          priority: 'medium',
          expectedDeliveryDate: '',
          description: ''
        });

        // Refresh orders list if on orders tab
        if (activeTab === 'orders') {
          await fetchOrders();
        }
      } else {
        const errorMsg = response.data?.message || 'Failed to create order';
        Alert.alert('Submission Failed', errorMsg);
      }

    } catch (error) {
      console.error('❌ Error submitting order data:', error);
      handleSubmissionError('order', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionError = (dataType, error) => {
    let errorMessage = `Failed to submit ${dataType}`;
    
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

  const handlePhoneChange = (text, field = 'phoneNumber') => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setCustomerData(prev => ({ ...prev, [field]: cleaned }));
    }
  };

  const handlePincodeChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 6) {
      setCustomerData(prev => ({ ...prev, pincode: cleaned }));
    }
  };

  const handleNumericChange = (text, field) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      setOrderData(prev => ({ ...prev, [field]: cleaned }));
    } else {
      setCustomerData(prev => ({ ...prev, [field]: cleaned }));
    }
  };

  // Edit functionality
  const handleEditPress = (item, type) => {
    setEditingItem(item);
    setEditType(type);
    
    if (type === 'customer') {
      setCustomerData({
        customerName: item.customerName || '',
        phoneNumber: item.phoneNumber || '',
        email: item.email || '',
        address: item.address || '',
        city: item.city || '',
        state: item.state || '',
        pincode: item.pincode || '',
        gstin: item.gstin || '',
        customerType: item.customerType || 'individual',
        creditLimit: item.creditLimit || '',
        paymentTerms: item.paymentTerms || '30',
        contactPerson: item.contactPerson || '',
        alternatePhone: item.alternatePhone || '',
        website: item.website || '',
        businessCategory: item.businessCategory || '',
        notes: item.notes || ''
      });
    } else if (type === 'order') {
      setOrderData({
        productName: item.productName || '',
        productCategory: item.productCategory || '',
        quantity: item.quantity?.toString() || '',
        unit: item.unit || 'pcs',
        unitPrice: item.unitPrice?.toString() || '',
        discount: item.discount?.toString() || '0',
        totalAmount: item.totalAmount?.toString() || '',
        orderType: item.orderType || 'sale',
        priority: item.priority || 'medium',
        expectedDeliveryDate: item.expectedDeliveryDate || '',
        description: item.description || ''
      });
    }
    
    setEditModalVisible(true);
  };

  const handleUpdateItem = async () => {
    const isCustomer = editType === 'customer';
    const isValid = isCustomer ? validateCustomerForm() : validateOrderForm();
    
    if (!isValid) {
      return;
    }

    try {
      setLoading(true);

      const updateData = isCustomer ? customerData : orderData;
      const endpoint = isCustomer ? 'customers' : 'orders';

      console.log(`📤 Updating ${editType}:`, { id: editingItem.id, ...updateData });

      const response = await axios.put(
        `http://192.168.29.161:3000/api/sales/${endpoint}/${editingItem.id}`, 
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
          `${isCustomer ? 'Customer' : 'Order'} has been updated successfully!`
        );

        setEditModalVisible(false);
        setEditingItem(null);
        setEditType('');
        
        // Refresh the appropriate list
        if (isCustomer) {
          await fetchCustomers();
        } else {
          await fetchOrders();
        }
      } else {
        const errorMsg = response.data?.message || `Failed to update ${editType}`;
        Alert.alert('Update Failed', errorMsg);
      }

    } catch (error) {
      console.error(`❌ Error updating ${editType}:`, error);
      Alert.alert('Update Error', `Failed to update ${editType}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item, type) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete this ${type}?`,
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
              setLoadingData(true);

              const endpoint = type === 'customer' ? 'customers' : 'orders';
              const response = await axios.delete(
                `http://192.168.29.161:3000/api/sales/${endpoint}/${item.id}`,
                {
                  timeout: 15000,
                  headers: {
                    'Content-Type': 'application/json',
                  }
                }
              );

              if (response.data?.success) {
                Alert.alert('Success', `${type} has been deleted successfully!`);
                
                // Refresh the appropriate list
                if (type === 'customer') {
                  await fetchCustomers();
                } else {
                  await fetchOrders();
                }
              } else {
                const errorMsg = response.data?.message || `Failed to delete ${type}`;
                Alert.alert('Delete Failed', errorMsg);
              }

            } catch (error) {
              console.error(`❌ Error deleting ${type}:`, error);
              Alert.alert('Delete Error', `Failed to delete ${type}. Please try again.`);
            } finally {
              setLoadingData(false);
            }
          },
        },
      ]
    );
  };

  const renderCustomerItem = ({ item, index }) => (
    <Card style={styles.detailCard}>
      <Card.Content style={{ padding: 20 }}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailIndex}>#{index + 1}</Text>
          <View style={styles.headerRight}>
            <Text style={[styles.recordType, { backgroundColor: '#E0F2FE', color: '#0EA5E9' }]}>
              {item.customerType?.toUpperCase() || 'CUSTOMER'}
            </Text>
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => handleEditPress(item, 'customer')}
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => handleDeleteItem(item, 'customer')}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.detailContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>{item.customerName || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{item.phoneNumber || 'N/A'}</Text>
          </View>

          {item.email && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{item.email}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>
              {`${item.address || ''}, ${item.city || ''}, ${item.state || ''} - ${item.pincode || ''}`}
            </Text>
          </View>

          {item.gstin && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>GSTIN:</Text>
              <Text style={styles.detailValue}>{item.gstin}</Text>
            </View>
          )}

          {item.creditLimit && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Credit:</Text>
              <Text style={styles.detailValue}>₹{item.creditLimit}</Text>
            </View>
          )}
          
          {item.createdAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Added:</Text>
              <Text style={styles.detailValueSmall}>
                {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderOrderItem = ({ item, index }) => (
    <Card style={styles.detailCard}>
      <Card.Content style={{ padding: 20 }}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailIndex}>#{index + 1}</Text>
          <View style={styles.headerRight}>
            <Text style={[styles.recordType, 
              item.orderType === 'sale' 
                ? { backgroundColor: '#D1FAE5', color: '#059669' }
                : { backgroundColor: '#FEF3C7', color: '#D97706' }
            ]}>
              {item.orderType?.toUpperCase() || 'ORDER'}
            </Text>
            <Text style={[styles.statusBadge, 
              item.priority === 'high' 
                ? styles.status_rejected
                : item.priority === 'low' 
                ? styles.status_pending
                : styles.status_approved
            ]}>
              {item.priority?.toUpperCase() || 'MEDIUM'}
            </Text>
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => handleEditPress(item, 'order')}
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => handleDeleteItem(item, 'order')}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.detailContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Product:</Text>
            <Text style={styles.detailValue}>{item.productName || 'N/A'}</Text>
          </View>

          {item.productCategory && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{item.productCategory}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={styles.detailValue}>{item.quantity || 0} {item.unit || 'pcs'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Unit Price:</Text>
            <Text style={styles.detailValue}>₹{item.unitPrice || 0}</Text>
          </View>

          {item.discount && parseFloat(item.discount) > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Discount:</Text>
              <Text style={styles.detailValue}>{item.discount}%</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total:</Text>
            <Text style={[styles.detailValue, { fontWeight: '700', color: '#059669' }]}>
              ₹{item.totalAmount || 0}
            </Text>
          </View>

          {item.expectedDeliveryDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery:</Text>
              <Text style={styles.detailValue}>{item.expectedDeliveryDate}</Text>
            </View>
          )}

          {item.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes:</Text>
              <Text style={styles.detailValue}>{item.description}</Text>
            </View>
          )}
          
          {item.createdAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
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
        style={[styles.tabButton, activeTab === 'customer' && styles.activeTab]}
        onPress={() => setActiveTab('customer')}
      >
        <Text style={[styles.tabText, activeTab === 'customer' && styles.activeTabText]}>
          Add Customer
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'order' && styles.activeTab]}
        onPress={() => setActiveTab('order')}
      >
        <Text style={[styles.tabText, activeTab === 'order' && styles.activeTabText]}>
          Create Order
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'customers' && styles.activeTab]}
        onPress={() => setActiveTab('customers')}
      >
        <Text style={[styles.tabText, activeTab === 'customers' && styles.activeTabText]}>
          Customers
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'orders' && styles.activeTab]}
        onPress={() => setActiveTab('orders')}
      >
        <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
          Orders
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCustomerForm = () => (
    <ScrollView style={styles.formScrollView}>
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
          <Title style={styles.formTitle}>Customer Information</Title>
          
          {/* Basic Information */}
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Basic Details</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Customer Name *"
              value={customerData.customerName}
              onChangeText={(text) => setCustomerData(prev => ({ ...prev, customerName: text }))}
              mode="outlined"
              style={styles.input}
              theme={{ colors: { primary: '#6366F1' } }}
              disabled={loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Phone Number *"
              value={customerData.phoneNumber}
              onChangeText={(text) => handlePhoneChange(text, 'phoneNumber')}
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
              label="Email Address"
              value={customerData.email}
              onChangeText={(text) => setCustomerData(prev => ({ ...prev, email: text }))}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              theme={{ colors: { primary: '#6366F1' } }}
              disabled={loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Alternate Phone"
              value={customerData.alternatePhone}
              onChangeText={(text) => handlePhoneChange(text, 'alternatePhone')}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              maxLength={10}
              theme={{ colors: { primary: '#6366F1' } }}
              disabled={loading}
            />
          </View>

          {/* Address Information */}
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Address Details</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Address *"
              value={customerData.address}
              onChangeText={(text) => setCustomerData(prev => ({ ...prev, address: text }))}
              mode="outlined"
              style={styles.textArea}
              multiline
              numberOfLines={3}
              theme={{ colors: { primary: '#6366F1' } }}
              disabled={loading}
            />
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <TextInput
                label="City *"
                value={customerData.city}
                onChangeText={(text) => setCustomerData(prev => ({ ...prev, city: text }))}
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: '#6366F1' } }}
                disabled={loading}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <TextInput
                label="State *"
                value={customerData.state}
                onChangeText={(text) => setCustomerData(prev => ({ ...prev, state: text }))}
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: '#6366F1' } }}
                disabled={loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Pincode *"
              value={customerData.pincode}
              onChangeText={handlePincodeChange}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              maxLength={6}
              placeholder="6-digit pincode"
              theme={{ colors: { primary: '#6366F1' } }}
              disabled={loading}
            />
          </View>

          {/* Business Information */}
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Business Details</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.pickerLabel}>Customer Type</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={[styles.pickerOption, customerData.customerType === 'individual' && styles.pickerOptionActive]}
                onPress={() => setCustomerData(prev => ({ ...prev, customerType: 'individual' }))}
              >
                <Text style={[styles.pickerOptionText, customerData.customerType === 'individual' && styles.pickerOptionTextActive]}>
                  Individual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerOption, customerData.customerType === 'business' && styles.pickerOptionActive]}
                onPress={() => setCustomerData(prev => ({ ...prev, customerType: 'business' }))}
              >
                <Text style={[styles.pickerOptionText, customerData.customerType === 'business' && styles.pickerOptionTextActive]}>
                  Business
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {customerData.customerType === 'business' && (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  label="GSTIN"
                  value={customerData.gstin}
                  onChangeText={(text) => setCustomerData(prev => ({ ...prev, gstin: text.toUpperCase() }))}
                  mode="outlined"
                  style={styles.input}
                  autoCapitalize="characters"
                  theme={{ colors: { primary: '#6366F1' } }}
                  disabled={loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Contact Person"
                  value={customerData.contactPerson}
                  onChangeText={(text) => setCustomerData(prev => ({ ...prev, contactPerson: text }))}
                  mode="outlined"
                  style={styles.input}
                  theme={{ colors: { primary: '#6366F1' } }}
                  disabled={loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Business Category"
                  value={customerData.businessCategory}
                  onChangeText={(text) => setCustomerData(prev => ({ ...prev, businessCategory: text }))}
                  mode="outlined"
                  style={styles.input}
                  theme={{ colors: { primary: '#6366F1' } }}
                  disabled={loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Website"
                  value={customerData.website}
                  onChangeText={(text) => setCustomerData(prev => ({ ...prev, website: text }))}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="url"
                  autoCapitalize="none"
                  theme={{ colors: { primary: '#6366F1' } }}
                  disabled={loading}
                />
              </View>
            </>
          )}

          {/* Financial Information */}
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Financial Details</Text>
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <TextInput
                label="Credit Limit (₹)"
                value={customerData.creditLimit}
                onChangeText={(text) => handleNumericChange(text, 'creditLimit')}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={{ colors: { primary: '#6366F1' } }}
                disabled={loading}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <TextInput
                label="Payment Terms (Days)"
                value={customerData.paymentTerms}
                onChangeText={(text) => setCustomerData(prev => ({ ...prev, paymentTerms: text.replace(/\D/g, '') }))}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={{ colors: { primary: '#6366F1' } }}
                disabled={loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Notes"
              value={customerData.notes}
              onChangeText={(text) => setCustomerData(prev => ({ ...prev, notes: text }))}
              mode="outlined"
              style={styles.textArea}
              multiline
              numberOfLines={3}
              theme={{ colors: { primary: '#6366F1' } }}
              disabled={loading}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleCustomerSubmit}
              disabled={loading}
            >
              <View style={styles.buttonContent}>
                {loading ? (
                  <Text style={styles.buttonText}>Saving Customer...</Text>
                ) : (
                  <>
                    <Text style={styles.buttonText}>Save Customer</Text>
                    <Text style={styles.buttonIcon}>👤</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Animated.View>
    </ScrollView>
  );

  const renderOrderForm = () => (
    <ScrollView style={styles.formScrollView}>
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
          <Title style={styles.formTitle}>Create Order</Title>
          
          {/* Order Type */}
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Order Type</Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={[styles.pickerOption, orderData.orderType === 'sale' && styles.pickerOptionActive]}
                onPress={() => setOrderData(prev => ({ ...prev, orderType: 'sale' }))}
              >
                <Text style={[styles.pickerOptionText, orderData.orderType === 'sale' && styles.pickerOptionTextActive]}>
                  Sale Order
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerOption, orderData.orderType === 'purchase' && styles.pickerOptionActive]}
                onPress={() => setOrderData(prev => ({ ...prev, orderType: 'purchase' }))}
              >
                <Text style={[styles.pickerOptionText, orderData.orderType === 'purchase' && styles.pickerOptionTextActive]}>
                  Purchase Order
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Product Information */}
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Product Details</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Product Name *"
              value={orderData.productName}
              onChangeText={(text) => setOrderData(prev => ({ ...prev, productName: text }))}
              mode="outlined"
              style={styles.input}
              theme={{ colors: { primary: '#6366F1' } }}
              disabled={loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Product Category"
              value={orderData.productCategory}
              onChangeText={(text) => setOrderData(prev => ({ ...prev, productCategory: text }))}
              mode="outlined"
              style={styles.input}
              theme={{ colors: { primary: '#6366F1' } }}
              disabled={loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Description"
              value={orderData.description}
              onChangeText={(text) => setOrderData(prev => ({ ...prev, description: text }))}
              mode="outlined"
              style={styles.textArea}
              multiline
              numberOfLines={3}
              theme={{ colors: { primary: '#6366F1' } }}
              disabled={loading}
            />
          </View>

          {/* Quantity and Pricing */}
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Quantity & Pricing</Text>
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 2, marginRight: 8 }]}>
              <TextInput
                label="Quantity *"
                value={orderData.quantity}
                onChangeText={(text) => handleNumericChange(text, 'quantity')}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={{ colors: { primary: '#6366F1' } }}
                disabled={loading}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.pickerLabel}>Unit</Text>
              <View style={styles.unitPickerContainer}>
                {['pcs', 'kg', 'ltr', 'mtr', 'box'].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.unitOption, orderData.unit === unit && styles.unitOptionActive]}
                    onPress={() => setOrderData(prev => ({ ...prev, unit }))}
                  >
                    <Text style={[styles.unitOptionText, orderData.unit === unit && styles.unitOptionTextActive]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <TextInput
                label="Unit Price (₹) *"
                value={orderData.unitPrice}
                onChangeText={(text) => handleNumericChange(text, 'unitPrice')}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={{ colors: { primary: '#6366F1' } }}
                disabled={loading}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <TextInput
                label="Discount (%)"
                value={orderData.discount}
                onChangeText={(text) => handleNumericChange(text, 'discount')}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={{ colors: { primary: '#6366F1' } }}
                disabled={loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>₹{orderData.totalAmount || '0.00'}</Text>
            </View>
          </View>

          {/* Additional Details */}
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Additional Details</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.pickerLabel}>Priority</Text>
            <View style={styles.pickerContainer}>
              {['low', 'medium', 'high'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[styles.pickerOption, orderData.priority === priority && styles.pickerOptionActive]}
                  onPress={() => setOrderData(prev => ({ ...prev, priority }))}
                >
                  <Text style={[styles.pickerOptionText, orderData.priority === priority && styles.pickerOptionTextActive]}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Expected Delivery Date"
              value={orderData.expectedDeliveryDate}
              onChangeText={(text) => setOrderData(prev => ({ ...prev, expectedDeliveryDate: text }))}
              mode="outlined"
              style={styles.input}
              placeholder="DD/MM/YYYY"
              theme={{ colors: { primary: '#6366F1' } }}
              disabled={loading}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleOrderSubmit}
              disabled={loading}
            >
              <View style={styles.buttonContent}>
                {loading ? (
                  <Text style={styles.buttonText}>Creating Order...</Text>
                ) : (
                  <>
                    <Text style={styles.buttonText}>Create Order</Text>
                    <Text style={styles.buttonIcon}>📦</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Animated.View>
    </ScrollView>
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
          <Text style={styles.logoText}>💼</Text>
        </View>
        <Title style={styles.title}>Sales & Purchase</Title>
        <Text style={styles.subtitle}>Customer & Order Management</Text>
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
      <Text style={styles.footerText}>Sales & Purchase Portal • Customer & Order Management System</Text>
    </View>
  );

  const renderContent = () => {
    if (activeTab === 'customer') {
      return (
        <View style={styles.container}>
          {renderHeader()}
          {renderTabButtons()}
          {renderCustomerForm()}
          {renderFooter()}
        </View>
      );
    } else if (activeTab === 'order') {
      return (
        <View style={styles.container}>
          {renderHeader()}
          {renderTabButtons()}
          {renderOrderForm()}
          {renderFooter()}
        </View>
      );
    } else if (activeTab === 'customers') {
      return (
        <FlatList
          data={customersList}
          renderItem={renderCustomerItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          ListHeaderComponent={
            <View>
              {renderHeader()}
              {renderTabButtons()}
              {loadingData && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6366F1" />
                  <Text style={styles.loadingText}>Loading customers...</Text>
                </View>
              )}
            </View>
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !loadingData ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>👤</Text>
                <Text style={styles.emptyTitle}>No Customers Found</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't added any customers yet.
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
    } else if (activeTab === 'orders') {
      return (
        <FlatList
          data={ordersList}
          renderItem={renderOrderItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          ListHeaderComponent={
            <View>
              {renderHeader()}
              {renderTabButtons()}
              {loadingData && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6366F1" />
                  <Text style={styles.loadingText}>Loading orders...</Text>
                </View>
              )}
            </View>
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !loadingData ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>📦</Text>
                <Text style={styles.emptyTitle}>No Orders Found</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't created any orders yet.
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
                <Text style={styles.modalTitle}>
                  Edit {editType === 'customer' ? 'Customer' : 'Order'}
                </Text>
                <TouchableOpacity 
                  onPress={() => setEditModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {editType === 'customer' ? renderCustomerForm() : renderOrderForm()}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.updateButton, loading && styles.submitButtonDisabled]}
                  onPress={handleUpdateItem}
                  disabled={loading}
                >
                  <Text style={styles.updateButtonText}>
                    {loading ? 'Updating...' : `Update ${editType === 'customer' ? 'Customer' : 'Order'}`}
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
  formScrollView: {
    flex: 1,
    paddingHorizontal: 16,
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
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
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
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    marginVertical: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366F1',
  },
  inputContainer: {
    marginBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: '#6366F1',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  pickerOptionTextActive: {
    color: '#FFFFFF',
  },
  unitPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  unitOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  unitOptionActive: {
    backgroundColor: '#6366F1',
  },
  unitOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  unitOptionTextActive: {
    color: '#FFFFFF',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#15803D',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#15803D',
  },
  buttonContainer: {
    marginTop: 20,
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
    maxHeight: '90%',
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
    maxHeight: '70%',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
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
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SalesPurchaseEmployeeScreen;