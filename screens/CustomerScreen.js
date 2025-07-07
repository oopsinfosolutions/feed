import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const CustomerScreen = ({ clientId }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentMethod: '',
    transactionId: '',
    paymentNotes: '',
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalBills, setTotalBills] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  // IMPORTANT: Update this to your actual server IP and port
  const API_BASE_URL = 'http://192.168.1.42:3000';

  // Enhanced test server connection
  const testConnection = async () => {
    try {
      console.log('Testing connection to:', `${API_BASE_URL}/api/test`);
      
      const response = await fetch(`${API_BASE_URL}/api/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      });

      console.log('Test response status:', response.status);
      console.log('Test response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.log('Non-JSON test response:', textResponse);
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      console.log('Test server response:', data);
      setConnectionStatus('connected');
      return true;
    } catch (error) {
      console.error('Server connection test failed:', error);
      setConnectionStatus('failed');
      
      let errorMessage = 'Connection failed. Please check:\n';
      if (error.message.includes('Network request failed')) {
        errorMessage += '• Network connection\n• Server is running\n• IP address is correct';
      } else if (error.message.includes('timeout')) {
        errorMessage += '• Server response time\n• Network latency';
      } else if (error.message.includes('non-JSON')) {
        errorMessage += '• Server is returning HTML instead of JSON\n• Check if the route exists';
      } else {
        errorMessage += `• Error: ${error.message}`;
      }
      
      Alert.alert('Connection Error', errorMessage);
      return false;
    }
  };

  // Enhanced fetchBills function with better error handling
  const fetchBills = useCallback(async (page = 1, status = 'all', refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Test connection first
      const isConnected = await testConnection();
      if (!isConnected) {
        return;
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      if (status !== 'all') {
        queryParams.append('status', status);
      }

      const url = `${API_BASE_URL}/api/client/bills/${clientId}?${queryParams}`;
      console.log('Fetching bills from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      console.log('Bills response status:', response.status);
      console.log('Bills response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bills error response:', errorText);
        
        if (response.status === 404) {
          throw new Error('Bills endpoint not found. Please check server routes.');
        } else if (response.status === 500) {
          throw new Error('Server error. Check server logs for details.');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON bills response:', textResponse);
        throw new Error('Server returned HTML instead of JSON. Check if the route exists.');
      }

      const data = await response.json();
      console.log('Bills API Response:', data);

      if (data.success) {
        if (page === 1) {
          setBills(data.data.bills || []);
        } else {
          setBills(prev => [...prev, ...(data.data.bills || [])]);
        }
        setHasNextPage(data.data.pagination?.hasNext || false);
        setTotalBills(data.data.pagination?.total || 0);
        setConnectionStatus('connected');
      } else {
        throw new Error(data.message || 'Failed to fetch bills');
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      setConnectionStatus('failed');
      
      let errorMessage = 'Failed to fetch bills:\n';
      if (error.message.includes('Network request failed')) {
        errorMessage += 'Network connection failed';
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Request timed out';
      } else if (error.message.includes('HTML instead of JSON')) {
        errorMessage += 'Server configuration issue';
      } else {
        errorMessage += error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId, API_BASE_URL]);

  // Enhanced fetchBillDetails function
  const fetchBillDetails = async (billId) => {
    try {
      const url = `${API_BASE_URL}/api/client/bill/${billId}?clientId=${clientId}`;
      console.log('Fetching bill details from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bill details error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON bill details response:', textResponse);
        throw new Error('Server returned HTML instead of JSON');
      }

      const data = await response.json();
      console.log('Bill details response:', data);

      if (data.success) {
        setSelectedBill(data.data);
        setShowBillDetails(true);
      } else {
        throw new Error(data.message || 'Failed to fetch bill details');
      }
    } catch (error) {
      console.error('Error fetching bill details:', error);
      Alert.alert('Error', `Failed to fetch bill details: ${error.message}`);
    }
  };

  // Enhanced markPaymentComplete function
  const markPaymentComplete = async () => {
    if (!paymentData.paymentMethod.trim()) {
      Alert.alert('Error', 'Please enter payment method');
      return;
    }

    setProcessingPayment(true);

    try {
      const url = `${API_BASE_URL}/api/client/bill/${selectedBill.id}/payment`;
      console.log('Updating payment status at:', url);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId,
          ...paymentData,
        }),
        timeout: 10000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment update error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON payment response:', textResponse);
        throw new Error('Server returned HTML instead of JSON');
      }

      const data = await response.json();
      console.log('Payment update response:', data);

      if (data.success) {
        Alert.alert('Success', 'Payment marked as complete successfully');
        setShowPaymentModal(false);
        setShowBillDetails(false);
        setPaymentData({
          paymentMethod: '',
          transactionId: '',
          paymentNotes: '',
        });
        // Refresh bills list
        fetchBills(1, statusFilter, true);
      } else {
        throw new Error(data.message || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      Alert.alert('Error', `Failed to update payment status: ${error.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Load more bills (pagination)
  const loadMoreBills = () => {
    if (hasNextPage && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchBills(nextPage, statusFilter);
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
    fetchBills(1, status);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'payment_pending':
        return '#ff6b6b';
      case 'complete':
        return '#51cf66';
      default:
        return '#868e96';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'payment_pending':
        return 'Payment Pending';
      case 'complete':
        return 'Completed';
      default:
        return status;
    }
  };

  // Enhanced debug component
  const DebugInfo = () => (
    <View style={styles.debugInfo}>
      <Text style={styles.debugText}>Client ID: {clientId}</Text>
      <Text style={styles.debugText}>API URL: {API_BASE_URL}</Text>
      <Text style={styles.debugText}>Connection: {connectionStatus}</Text>
      <Text style={styles.debugText}>Bills Count: {bills.length}</Text>
      <Text style={styles.debugText}>Current Page: {currentPage}</Text>
      <Text style={styles.debugText}>Has Next Page: {hasNextPage ? 'Yes' : 'No'}</Text>
      <TouchableOpacity 
        style={styles.testButton}
        onPress={() => testConnection()}
      >
        <Text style={styles.testButtonText}>Test Connection</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.testButton, { backgroundColor: '#28a745' }]}
        onPress={() => fetchBills(1, statusFilter, true)}
      >
        <Text style={styles.testButtonText}>Force Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Bill item component
  const BillItem = ({ item }) => (
    <TouchableOpacity
      style={styles.billItem}
      onPress={() => fetchBillDetails(item.id)}
    >
      <View style={styles.billHeader}>
        <Text style={styles.billNumber}>{item.billNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.billContent}>
        <Text style={styles.billAmount}>{formatCurrency(item.amount)}</Text>
        <Text style={styles.billDate}>Sent: {formatDate(item.sentAt)}</Text>
        {item.dueDate && (
          <Text style={styles.dueDate}>Due: {formatDate(item.dueDate)}</Text>
        )}
        {item.order && (
          <Text style={styles.orderName}>{item.order.name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Filter buttons component
  const FilterButtons = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, statusFilter === 'all' && styles.activeFilter]}
        onPress={() => handleStatusFilterChange('all')}
      >
        <Text style={[styles.filterText, statusFilter === 'all' && styles.activeFilterText]}>
          All
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, statusFilter === 'payment_pending' && styles.activeFilter]}
        onPress={() => handleStatusFilterChange('payment_pending')}
      >
        <Text style={[styles.filterText, statusFilter === 'payment_pending' && styles.activeFilterText]}>
          Pending
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, statusFilter === 'complete' && styles.activeFilter]}
        onPress={() => handleStatusFilterChange('complete')}
      >
        <Text style={[styles.filterText, statusFilter === 'complete' && styles.activeFilterText]}>
          Completed
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Bill details modal
  const BillDetailsModal = () => (
    <Modal
      visible={showBillDetails}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Bill Details</Text>
          <TouchableOpacity onPress={() => setShowBillDetails(false)}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
        
        {selectedBill && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.billDetailCard}>
              <Text style={styles.billDetailNumber}>{selectedBill.billNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBill.status) }]}>
                <Text style={styles.statusText}>{getStatusText(selectedBill.status)}</Text>
              </View>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Amount</Text>
              <Text style={styles.amountText}>{formatCurrency(selectedBill.amount)}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Dates</Text>
              <Text style={styles.detailText}>Sent: {formatDate(selectedBill.sentAt)}</Text>
              {selectedBill.dueDate && (
                <Text style={styles.detailText}>Due: {formatDate(selectedBill.dueDate)}</Text>
              )}
              {selectedBill.paidAt && (
                <Text style={styles.detailText}>Paid: {formatDate(selectedBill.paidAt)}</Text>
              )}
            </View>
            
            {selectedBill.order && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Order Details</Text>
                <Text style={styles.detailText}>Item: {selectedBill.order.name}</Text>
                <Text style={styles.detailText}>
                  Quantity: {selectedBill.order.quantity} {selectedBill.order.unit}
                </Text>
                <Text style={styles.detailText}>
                  Unit Price: {formatCurrency(selectedBill.order.unitPrice)}
                </Text>
                {selectedBill.order.description && (
                  <Text style={styles.detailText}>Description: {selectedBill.order.description}</Text>
                )}
                {selectedBill.order.vehicleName && (
                  <Text style={styles.detailText}>Vehicle: {selectedBill.order.vehicleName}</Text>
                )}
                {selectedBill.order.vehicleNumber && (
                  <Text style={styles.detailText}>Vehicle Number: {selectedBill.order.vehicleNumber}</Text>
                )}
              </View>
            )}
            
            {selectedBill.additionalNotes && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Additional Notes</Text>
                <Text style={styles.detailText}>{selectedBill.additionalNotes}</Text>
              </View>
            )}
            
            {selectedBill.paymentMethod && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Payment Information</Text>
                <Text style={styles.detailText}>Method: {selectedBill.paymentMethod}</Text>
                {selectedBill.transactionId && (
                  <Text style={styles.detailText}>Transaction ID: {selectedBill.transactionId}</Text>
                )}
                {selectedBill.paymentNotes && (
                  <Text style={styles.detailText}>Notes: {selectedBill.paymentNotes}</Text>
                )}
              </View>
            )}
            
            {selectedBill.order?.image1 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Images</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedBill.order.image1 && (
                    <Image
                      source={{ uri: `${API_BASE_URL}${selectedBill.order.image1}` }}
                      style={styles.orderImage}
                    />
                  )}
                  {selectedBill.order.image2 && (
                    <Image
                      source={{ uri: `${API_BASE_URL}${selectedBill.order.image2}` }}
                      style={styles.orderImage}
                    />
                  )}
                  {selectedBill.order.image3 && (
                    <Image
                      source={{ uri: `${API_BASE_URL}${selectedBill.order.image3}` }}
                      style={styles.orderImage}
                    />
                  )}
                </ScrollView>
              </View>
            )}
            
            {selectedBill.status === 'payment_pending' && (
              <TouchableOpacity
                style={styles.paymentButton}
                onPress={() => setShowPaymentModal(true)}
              >
                <Text style={styles.paymentButtonText}>Mark as Paid</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // Payment modal
  const PaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.paymentModalOverlay}>
        <View style={styles.paymentModalContent}>
          <Text style={styles.paymentModalTitle}>Mark Payment as Complete</Text>
          
          <TextInput
            style={styles.paymentInput}
            placeholder="Payment Method (e.g., Cash, UPI, Bank Transfer)"
            value={paymentData.paymentMethod}
            onChangeText={(text) => setPaymentData({...paymentData, paymentMethod: text})}
          />
          
          <TextInput
            style={styles.paymentInput}
            placeholder="Transaction ID (optional)"
            value={paymentData.transactionId}
            onChangeText={(text) => setPaymentData({...paymentData, transactionId: text})}
          />
          
          <TextInput
            style={[styles.paymentInput, styles.paymentNotesInput]}
            placeholder="Payment Notes (optional)"
            value={paymentData.paymentNotes}
            onChangeText={(text) => setPaymentData({...paymentData, paymentNotes: text})}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.paymentModalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={markPaymentComplete}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Initial load
  useEffect(() => {
    // Add a small delay to ensure component is mounted
    const timer = setTimeout(() => {
      fetchBills(1, statusFilter);
    }, 100);

    return () => clearTimeout(timer);
  }, [statusFilter]);

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bills</Text>
        <Text style={styles.subtitle}>Total: {totalBills}</Text>
      </View>
      
      <DebugInfo />
      
      <FilterButtons />
      
      {loading && bills.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading bills...</Text>
          <Text style={styles.loadingSubtext}>Connection: {connectionStatus}</Text>
        </View>
      ) : (
        <FlatList
          data={bills}
          renderItem={({ item }) => <BillItem item={item} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBills(1, statusFilter, true)}
            />
          }
          onEndReached={loadMoreBills}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            hasNextPage && !loading ? (
              <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingFooterText}>Loading more...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bills found</Text>
                <Text style={styles.emptySubtext}>
                  {statusFilter === 'all' 
                    ? 'You don\'t have any bills yet' 
                    : `No ${statusFilter === 'payment_pending' ? 'pending' : 'completed'} bills found`}
                </Text>
                <Text style={styles.emptySubtext}>Connection: {connectionStatus}</Text>
              </View>
            ) : null
          }
        />
      )}
      
      <BillDetailsModal />
      <PaymentModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  debugInfo: {
    backgroundColor: '#fff3cd',
    padding: 10,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 2,
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 6,
    marginTop: 5,
    marginBottom: 2,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 20,
  },
  billItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  billContent: {
    gap: 4,
  },
  billAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  billDate: {
    fontSize: 14,
    color: '#666666',
  },
  dueDate: {
    fontSize: 14,
    color: '#ff6b6b',
  },
  orderName: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 12,
    color: '#999999',
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingFooterText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  billDetailCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  billDetailNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  amountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  detailText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  orderImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginRight: 10,
  },
  paymentButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  paymentButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
  },
  paymentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  paymentNotesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  paymentModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomerScreen;