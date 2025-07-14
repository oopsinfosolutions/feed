import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  Linking,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Update this to match your server URL
const API_BASE_URL = 'http://192.168.1.42:3000';

const CustomerScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentMethod: '',
    transactionId: '',
    paymentNotes: ''
  });

  const [stats, setStats] = useState({
    totalBills: 0,
    pendingBills: 0,
    successfulBills: 0,
    totalAmount: 0,
    pendingAmount: 0
  });

  const paymentMethods = [
    'Cash',
    'UPI',
    'Bank Transfer',
    'Credit Card',
    'Debit Card',
    'Cheque',
    'Online Banking'
  ];

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const navigateToLogin = () => {
    navigation.replace('Login');
  };

  const loadUserData = async () => {
    try {
      console.log('=== Loading user data ===');
      
      // Get data using the keys that LoginForm actually saves
      const userId = await AsyncStorage.getItem('user_id');
      const userType = await AsyncStorage.getItem('user_type');
      const userPhone = await AsyncStorage.getItem('user_phone');
      const userName = await AsyncStorage.getItem('user_name');
      
      console.log('Raw user data from storage:');
      console.log('- user_id:', userId);
      console.log('- user_type:', userType);
      console.log('- user_phone:', userPhone);
      console.log('- user_name:', userName);
      
      if (!userId || !userType) {
        console.log('Essential user data missing');
        Alert.alert('Authentication Issue', 'Please login again. User data not found.');
        navigateToLogin();
        return;
      }
      
      // Create user object from individual storage items
      const parsedUser = {
        id: parseInt(userId),
        type: userType,
        fullname: userName || 'User',
        phone: userPhone
      };
      
      console.log('Constructed user object:', parsedUser);
      
      // Check if this is actually a customer - be flexible with user type
      if (userType && userType !== 'Client' && userType !== 'client' && userType !== 'Customer') {
        console.log('User is not a client, type is:', userType);
        Alert.alert('Access Denied', `This screen is for customers only. Your account type: ${userType}`);
        navigateToLogin();
        return;
      }
      
      setUser(parsedUser);
      console.log('User data set successfully, now fetching bills...');
      
      // Fetch bills for this user
      await fetchBills(parsedUser.id);
      
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', `Failed to load user data: ${error.message}. Please login again.`);
      navigateToLogin();
    }
  };

  const fetchBills = async (clientId) => {
    try {
      console.log('=== Fetching bills ===');
      setLoading(true);
      
      // Create a dummy token since your backend doesn't seem to require real JWT authentication
      const dummyToken = 'dummy-token-for-api-calls';
      
      console.log(`Fetching bills for client ID: ${clientId}`);
      console.log(`Using dummy token for API calls`);
      
      const response = await fetch(`${API_BASE_URL}/api/client/bills/${clientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${dummyToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Bills API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Bills API response data:', JSON.stringify(data, null, 2));
        
        if (data.success) {
          const bills = data.data.bills || [];
          console.log(`Successfully fetched ${bills.length} bills`);
          setBills(bills);
          calculateStats(bills);
        } else {
          console.error('API returned error:', data.message);
          Alert.alert('Error', data.message || 'Failed to fetch bills');
        }
      } else if (response.status === 401) {
        console.log('Unauthorized response - API might require authentication');
        const errorText = await response.text();
        console.log('401 Error details:', errorText);
        
        // Don't redirect on 401, just show error since your backend might not have auth middleware
        Alert.alert('API Error', 'Bills API requires authentication. Please contact support.');
      } else {
        const errorData = await response.text();
        console.error('HTTP error:', response.status, errorData);
        
        // Don't redirect on API errors, just show the error
        Alert.alert('Error', `Failed to fetch bills (${response.status}). Please try again later.`);
      }
    } catch (error) {
      console.error('Network error fetching bills:', error);
      
      // Don't redirect on network errors, just show the error
      Alert.alert('Network Error', 'Could not connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (billsData) => {
    const totalBills = billsData.length;
    const pendingBills = billsData.filter(bill => bill.paymentStatus === 'pending').length;
    const successfulBills = billsData.filter(bill => bill.paymentStatus === 'successful').length;
    const totalAmount = billsData.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0);
    const pendingAmount = billsData
      .filter(bill => bill.paymentStatus === 'pending')
      .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0);

    setStats({
      totalBills,
      pendingBills,
      successfulBills,
      totalAmount,
      pendingAmount
    });

    console.log('Calculated stats:', {
      totalBills,
      pendingBills,
      successfulBills,
      totalAmount,
      pendingAmount
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (user) {
      fetchBills(user.id);
    }
  };

  const handleBillPress = async (bill) => {
    try {
      const dummyToken = 'dummy-token-for-api-calls';
      console.log(`Fetching details for bill ID: ${bill.id}`);
      
      const response = await fetch(
        `${API_BASE_URL}/api/client/bill/${bill.id}?clientId=${user.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${dummyToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Bill detail response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Bill detail response:', data);
        
        if (data.success) {
          setSelectedBill(data.data);
        } else {
          Alert.alert('Error', data.message || 'Failed to fetch bill details');
        }
      } else {
        const errorData = await response.text();
        console.error('Bill detail error:', response.status, errorData);
        Alert.alert('Error', 'Failed to fetch bill details');
      }
    } catch (error) {
      console.error('Error fetching bill details:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handlePayment = async () => {
    if (!paymentData.paymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      const dummyToken = 'dummy-token-for-api-calls';
      console.log('Submitting payment for bill:', selectedBill.id);
      
      const response = await fetch(
        `${API_BASE_URL}/api/client/bill/${selectedBill.id}/payment`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${dummyToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientId: user.id,
            ...paymentData
          })
        }
      );

      console.log('Payment response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Payment response:', data);
        
        Alert.alert('Success', 'Payment marked as completed successfully!');
        setShowPaymentModal(false);
        setPaymentData({ paymentMethod: '', transactionId: '', paymentNotes: '' });
        setSelectedBill(null);
        await fetchBills(user.id);
      } else {
        const errorData = await response.json();
        console.error('Payment error:', errorData);
        Alert.alert('Error', errorData.message || 'Failed to update payment');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear the data using the same keys LoginForm uses
              await AsyncStorage.multiRemove(['user_id', 'user_type', 'user_phone', 'user_name']);
              navigateToLogin();
            } catch (error) {
              console.error('Error during logout:', error);
              navigateToLogin();
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ffc107';
      case 'successful':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'successful':
        return 'Paid';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const makePhoneCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading bills...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.fullname || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="receipt" size={24} color="#007bff" />
            <Text style={styles.statValue}>{stats.totalBills}</Text>
            <Text style={styles.statLabel}>Total Bills</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="pending" size={24} color="#ffc107" />
            <Text style={styles.statValue}>{stats.pendingBills}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="check-circle" size={24} color="#28a745" />
            <Text style={styles.statValue}>{stats.successfulBills}</Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>
        </View>

        <View style={styles.amountContainer}>
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>₹{stats.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Pending Amount</Text>
            <Text style={[styles.amountValue, styles.pendingAmount]}>₹{stats.pendingAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.supportContainer}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={() => makePhoneCall('+919876543210')}
          >
            <Icon name="phone" size={20} color="#007bff" />
            <Text style={styles.supportText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Bills List */}
        <View style={styles.billsSection}>
          <Text style={styles.sectionTitle}>Your Bills</Text>
          
          {bills.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="receipt-long" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No bills found</Text>
              <Text style={styles.emptyStateSubtext}>Your bills will appear here once created</Text>
            </View>
          ) : (
            bills.map((bill) => (
              <TouchableOpacity
                key={bill.id}
                style={styles.billCard}
                onPress={() => handleBillPress(bill)}
              >
                <View style={styles.billHeader}>
                  <View style={styles.billInfo}>
                    <Text style={styles.billNumber}>{bill.billNumber}</Text>
                    <Text style={styles.materialName}>{bill.materialName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.paymentStatus) }]}>
                    <Text style={styles.statusText}>{getStatusText(bill.paymentStatus)}</Text>
                  </View>
                </View>
                
                <View style={styles.billDetails}>
                  <View style={styles.billDetailRow}>
                    <Text style={styles.billDetailLabel}>Quantity:</Text>
                    <Text style={styles.billDetailValue}>{bill.quantity} {bill.unit}</Text>
                  </View>
                  <View style={styles.billDetailRow}>
                    <Text style={styles.billDetailLabel}>Amount:</Text>
                    <Text style={styles.billDetailValue}>₹{parseFloat(bill.totalAmount || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.billDetailRow}>
                    <Text style={styles.billDetailLabel}>Date:</Text>
                    <Text style={styles.billDetailValue}>{formatDate(bill.sentAt)}</Text>
                  </View>
                  {bill.dueDate && (
                    <View style={styles.billDetailRow}>
                      <Text style={styles.billDetailLabel}>Due Date:</Text>
                      <Text style={styles.billDetailValue}>{formatDate(bill.dueDate)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.billFooter}>
                  <Icon name="chevron-right" size={20} color="#007bff" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bill Detail Modal */}
      <Modal
        visible={!!selectedBill}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bill Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedBill(null)}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedBill && (
              <>
                <View style={styles.billDetailSection}>
                  <Text style={styles.detailSectionTitle}>Bill Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bill Number:</Text>
                    <Text style={styles.detailValue}>{selectedBill.billNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Material:</Text>
                    <Text style={styles.detailValue}>{selectedBill.materialName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description:</Text>
                    <Text style={styles.detailValue}>{selectedBill.description || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBill.paymentStatus) }]}>
                      <Text style={styles.statusText}>{getStatusText(selectedBill.paymentStatus)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.billDetailSection}>
                  <Text style={styles.detailSectionTitle}>Quantity & Pricing</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <Text style={styles.detailValue}>{selectedBill.quantity} {selectedBill.unit}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Unit Price:</Text>
                    <Text style={styles.detailValue}>₹{parseFloat(selectedBill.unitPrice || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Subtotal:</Text>
                    <Text style={styles.detailValue}>₹{parseFloat(selectedBill.subtotal || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Discount:</Text>
                    <Text style={styles.detailValue}>₹{parseFloat(selectedBill.discountAmount || 0).toFixed(2)} ({selectedBill.discountPercentage || 0}%)</Text>
                  </View>
                  <View style={[styles.detailRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalValue}>₹{parseFloat(selectedBill.totalAmount || 0).toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.billDetailSection}>
                  <Text style={styles.detailSectionTitle}>Delivery Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{selectedBill.deliveryAddress || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pincode:</Text>
                    <Text style={styles.detailValue}>{selectedBill.pincode || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vehicle:</Text>
                    <Text style={styles.detailValue}>{selectedBill.vehicleName || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vehicle Number:</Text>
                    <Text style={styles.detailValue}>{selectedBill.vehicleNumber || 'N/A'}</Text>
                  </View>
                </View>

                {selectedBill.paymentStatus === 'successful' && (
                  <View style={styles.billDetailSection}>
                    <Text style={styles.detailSectionTitle}>Payment Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Method:</Text>
                      <Text style={styles.detailValue}>{selectedBill.paymentMethod || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Transaction ID:</Text>
                      <Text style={styles.detailValue}>{selectedBill.transactionId || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Date:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedBill.paymentDate)}</Text>
                    </View>
                  </View>
                )}

                {selectedBill.additionalNotes && (
                  <View style={styles.billDetailSection}>
                    <Text style={styles.detailSectionTitle}>Additional Notes</Text>
                    <Text style={styles.notesText}>{selectedBill.additionalNotes}</Text>
                  </View>
                )}

                {selectedBill.paymentStatus === 'pending' && (
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => setShowPaymentModal(true)}
                  >
                    <Icon name="payment" size={20} color="#fff" />
                    <Text style={styles.payButtonText}>Mark as Paid</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView style={styles.paymentModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.paymentForm}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Payment Method *</Text>
              <View style={styles.paymentMethodContainer}>
                {paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodButton,
                      paymentData.paymentMethod === method && styles.selectedPaymentMethod
                    ]}
                    onPress={() => setPaymentData({...paymentData, paymentMethod: method})}
                  >
                    <Text style={[
                      styles.paymentMethodText,
                      paymentData.paymentMethod === method && styles.selectedPaymentMethodText
                    ]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Transaction ID</Text>
              <TextInput
                style={styles.textInput}
                value={paymentData.transactionId}
                onChangeText={(text) => setPaymentData({...paymentData, transactionId: text})}
                placeholder="Enter transaction ID (optional)"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Payment Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={paymentData.paymentNotes}
                onChangeText={(text) => setPaymentData({...paymentData, paymentNotes: text})}
                placeholder="Enter any additional notes (optional)"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.confirmPaymentButton} onPress={handlePayment}>
              <Text style={styles.confirmPaymentText}>Confirm Payment</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  header: {
    backgroundColor: '#007bff',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  userInfo: {
    flex: 1
  },
  welcomeText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  logoutButton: {
    padding: 8
  },
  scrollView: {
    flex: 1,
    padding: 20
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5
  },
  amountContainer: {
    flexDirection: 'row',
    marginBottom: 20
  },
  amountCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  pendingAmount: {
    color: '#ffc107'
  },
  supportContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10
  },
  supportText: {
    fontSize: 16,
    color: '#007bff',
    marginLeft: 10,
    fontWeight: '500'
  },
  billsSection: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center'
  },
  billCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15
  },
  billInfo: {
    flex: 1
  },
  billNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  materialName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  billDetails: {
    marginBottom: 15
  },
  billDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  billDetailLabel: {
    fontSize: 14,
    color: '#666'
  },
  billDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  billFooter: {
    alignItems: 'flex-end'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 5
  },
  modalContent: {
    flex: 1,
    padding: 20
  },
  billDetailSection: {
    marginBottom: 25
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right'
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#007bff',
    marginTop: 10,
    paddingTop: 10
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff'
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  payButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10
  },
  paymentModalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  paymentForm: {
    flex: 1,
    padding: 20
  },
  inputContainer: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  paymentMethodButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff'
  },
  selectedPaymentMethod: {
    backgroundColor: '#007bff',
    borderColor: '#007bff'
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666'
  },
  selectedPaymentMethodText: {
    color: '#fff'
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  confirmPaymentButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20
  },
  confirmPaymentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default CustomerScreen;