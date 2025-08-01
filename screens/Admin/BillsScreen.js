import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const API_BASE_URL = 'http://192.168.1.22:3000';

const BillsScreen = () => {
  const navigation = useNavigation();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    successful: 0,
    failed: 0,
    totalAmount: 0
  });

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/bills`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBills(data.data.bills || []);
          calculateStats(data.data.bills || []);
        } else {
          Alert.alert('Error', data.message || 'Failed to fetch bills');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      Alert.alert('Error', 'Failed to fetch bills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (billsData) => {
    const stats = {
      total: billsData.length,
      pending: billsData.filter(bill => bill.paymentStatus === 'pending').length,
      successful: billsData.filter(bill => bill.paymentStatus === 'successful').length,
      failed: billsData.filter(bill => bill.paymentStatus === 'failed').length,
      totalAmount: billsData.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0)
    };
    setStats(stats);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'successful':
      case 'paid':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'failed':
      case 'cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'successful':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status || 'Unknown';
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.materialName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.Client?.fullname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStatsCard = (title, count, color, icon) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsCardContent}>
        <Icon name={icon} size={24} color={color} />
        <View style={styles.statsTextContainer}>
          <Text style={styles.statsCount}>{count}</Text>
          <Text style={styles.statsTitle}>{title}</Text>
        </View>
      </View>
    </View>
  );

  const renderBillItem = ({ item }) => (
    <TouchableOpacity
      style={styles.billCard}
      onPress={() => {
        setSelectedBill(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.billHeader}>
        <View style={styles.billInfo}>
          <Text style={styles.billNumber}>{item.billNumber}</Text>
          <Text style={styles.materialName}>{item.materialName}</Text>
          <Text style={styles.clientName}>
            Client: {item.Client?.fullname || 'Unknown Client'}
          </Text>
        </View>
        <View style={styles.billRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.paymentStatus) }]}>
            <Text style={styles.statusText}>{getStatusText(item.paymentStatus)}</Text>
          </View>
          <Text style={styles.billAmount}>₹{parseFloat(item.totalAmount || 0).toFixed(2)}</Text>
        </View>
      </View>
      
      <View style={styles.billDetails}>
        <Text style={styles.billDetail}>Qty: {item.quantity} {item.unit}</Text>
        <Text style={styles.billDetail}>Rate: ₹{item.unitPrice}</Text>
        <Text style={styles.billDetail}>
          Date: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bills Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateOrder')}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          {renderStatsCard('Total', stats.total, '#007bff', 'receipt')}
          {renderStatsCard('Pending', stats.pending, '#ffc107', 'schedule')}
        </View>
        <View style={styles.statsRow}>
          {renderStatsCard('Paid', stats.successful, '#28a745', 'check-circle')}
          {renderStatsCard('Failed', stats.failed, '#dc3545', 'error')}
        </View>
        <View style={styles.totalAmountCard}>
          <Text style={styles.totalAmountLabel}>Total Amount</Text>
          <Text style={styles.totalAmountValue}>₹{stats.totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search bills..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Bills List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading bills...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          renderItem={renderBillItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="receipt-long" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No bills found</Text>
              <Text style={styles.emptyStateSubtext}>Bills will appear here once created</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Bill Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bill Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {selectedBill && (
            <View style={styles.modalContent}>
              <View style={styles.detailSection}>
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
                  <Text style={styles.detailLabel}>Client:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBill.Client?.fullname || 'Unknown Client'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBill.paymentStatus) }]}>
                    <Text style={styles.statusText}>{getStatusText(selectedBill.paymentStatus)}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Amount:</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    ₹{parseFloat(selectedBill.totalAmount || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  statsContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statsCard: {
    flex: 0.48,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsTextContainer: {
    marginLeft: 10,
  },
  statsCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statsTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  totalAmountCard: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  totalAmountLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  totalAmountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    paddingHorizontal: 15,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  billCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  billInfo: {
    flex: 1,
  },
  billNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  materialName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  clientName: {
    fontSize: 12,
    color: '#007bff',
    marginTop: 4,
  },
  billRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  billDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  billDetail: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 25,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
});

export default BillsScreen;