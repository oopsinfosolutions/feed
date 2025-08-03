// File: screens/Admin/AdminBillsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  KeyboardAvoidingView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ENDPOINTS, apiUtils } from '../../config/ApiConfig';

const { width } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

const AdminBillsScreen = ({ navigation }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [stats, setStats] = useState({ totalBills: 0, pendingBills: 0, paidBills: 0, totalRevenue: 0, pendingRevenue: 0 });
  const [paymentData, setPaymentData] = useState({ paymentMethod: '', transactionId: '', paymentNotes: '' });
  const [fadeAnim] = useState(new Animated.Value(0));

  const paymentMethods = ['UPI Payment', 'Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Cheque', 'Online Banking'];

  useFocusEffect(useCallback(() => { loadBillsData(); loadBillsStats(); animateIn(); }, []));

  const animateIn = () => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  const loadBillsData = async () => {
    try {
      setLoading(!refreshing);
      const token = await AsyncStorage.getItem('authToken') || 'dummy-token';
      const response = await apiUtils.fetchWithRetry(apiUtils.buildUrl(API_ENDPOINTS.BILLS_ADMIN), {
        method: 'GET',
        headers: apiUtils.getAuthHeaders(token)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBills(data.data.bills || []);
        } else {
          throw new Error(data.message || 'Failed to fetch bills');
        }
      } else if (response.status === 401) {
        handleAuthError();
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading bills:', error);
      Alert.alert('Error', 'Failed to load bills. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBillsStats = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken') || 'dummy-token';
      const response = await apiUtils.fetchWithRetry(apiUtils.buildUrl(API_ENDPOINTS.BILLS_STATS), {
        method: 'GET',
        headers: apiUtils.getAuthHeaders(token)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading bills stats:', error);
    }
  };

  const handleAuthError = () => {
    Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
      { text: 'OK', onPress: () => { AsyncStorage.multiRemove(['authToken', 'user_data']); navigation.replace('Login'); }}
    ]);
  };

  const onRefresh = () => { setRefreshing(true); loadBillsData(); loadBillsStats(); };

  const handleBillPress = (bill) => { setSelectedBill(bill); setShowDetailModal(true); };

  const handleUpdatePayment = (bill) => {
    setSelectedBill(bill);
    setPaymentData({ paymentMethod: bill.paymentMethod || '', transactionId: bill.transactionId || '', paymentNotes: bill.paymentNotes || '' });
    setShowPaymentModal(true);
  };

  const submitPaymentUpdate = async () => {
    if (!paymentData.paymentMethod.trim()) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      setSubmittingPayment(true);
      const token = await AsyncStorage.getItem('authToken') || 'dummy-token';
      const url = apiUtils.buildUrl(API_ENDPOINTS.BILLS_PAYMENT_UPDATE.replace(':id', selectedBill.id));
      
      const response = await apiUtils.fetchWithRetry(url, {
        method: 'PATCH',
        headers: apiUtils.getAuthHeaders(token),
        body: JSON.stringify({ paymentStatus: 'successful', ...paymentData })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Alert.alert('Success', 'Payment status updated successfully');
          setShowPaymentModal(false);
          setSelectedBill(null);
          setPaymentData({ paymentMethod: '', transactionId: '', paymentNotes: '' });
          loadBillsData();
          loadBillsStats();
        } else {
          Alert.alert('Error', data.message || 'Failed to update payment');
        }
      } else {
        Alert.alert('Error', 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const renderBillItem = ({ item }) => (
    <Animated.View style={[billsStyles.billCardWrapper, { opacity: fadeAnim }]}>
      <TouchableOpacity style={billsStyles.billCard} onPress={() => handleBillPress(item)} activeOpacity={0.7}>
        <View style={billsStyles.billHeader}>
          <View style={billsStyles.billInfo}>
            <View style={billsStyles.billNumberContainer}>
              <Icon name="receipt" size={20} color="#2196F3" />
              <Text style={billsStyles.billNumber}>{item.billNumber}</Text>
            </View>
            <Text style={billsStyles.clientName}>{item.Client?.fullname || 'Unknown Client'}</Text>
            <Text style={billsStyles.billDate}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={billsStyles.billAmount}>
            <Text style={billsStyles.amountText}>{formatCurrency(item.totalAmount)}</Text>
            <View style={[billsStyles.statusBadge, billsStyles[`status${item.paymentStatus}`]]}>
              <Icon name={item.paymentStatus === 'successful' ? 'check-circle' : 'schedule'} size={12} color={item.paymentStatus === 'successful' ? '#4CAF50' : '#FF9800'} style={{ marginRight: 4 }} />
              <Text style={billsStyles.statusText}>{item.paymentStatus}</Text>
            </View>
          </View>
        </View>
        
        <View style={billsStyles.billFooter}>
          <Text style={billsStyles.materialName} numberOfLines={1}>{item.materialName || 'No material specified'}</Text>
          {item.paymentStatus === 'pending' && (
            <TouchableOpacity style={billsStyles.updateButton} onPress={() => handleUpdatePayment(item)} activeOpacity={0.7}>
              <Icon name="payment" size={16} color="#4CAF50" />
              <Text style={billsStyles.updateButtonText}>Mark Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStatCard = (title, value, color, icon) => (
    <View style={[billsStyles.statCard, { borderLeftColor: color }]}>
      <View style={billsStyles.statIcon}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={[billsStyles.statNumber, { color }]}>{value}</Text>
      <Text style={billsStyles.statLabel}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={billsStyles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={billsStyles.loadingContainer}>
          <ActivityIndicator size={isIOS ? "large" : 50} color="#4CAF50" />
          <Text style={billsStyles.loadingText}>Loading Bills...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={billsStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={billsStyles.header}>
        <TouchableOpacity style={billsStyles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={billsStyles.headerContent}>
          <Text style={billsStyles.headerTitle}>Bills Management</Text>
          <Text style={billsStyles.headerSubtitle}>{stats.totalBills} total • {formatCurrency(stats.totalRevenue)} revenue</Text>
        </View>
      </View>

      {/* Statistics */}
      <Animated.View style={[billsStyles.statsContainer, { opacity: fadeAnim }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={billsStyles.statsContent}>
          {renderStatCard('Total Bills', stats.totalBills, '#4CAF50', 'receipt')}
          {renderStatCard('Pending', stats.pendingBills, '#FF9800', 'schedule')}
          {renderStatCard('Paid', stats.paidBills, '#2196F3', 'check-circle')}
          {renderStatCard('Revenue', formatCurrency(stats.totalRevenue), '#9C27B0', 'attach-money')}
        </ScrollView>
      </Animated.View>

      {/* Bills List */}
      <FlatList
        data={bills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={billsStyles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} tintColor="#4CAF50" />}
        ListEmptyComponent={
          <Animated.View style={[billsStyles.emptyContainer, { opacity: fadeAnim }]}>
            <Icon name="receipt" size={64} color="#E0E0E0" />
            <Text style={billsStyles.emptyText}>No bills found</Text>
            <Text style={billsStyles.emptySubtext}>Bills will appear here when created</Text>
          </Animated.View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Payment Update Modal */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle={isIOS ? "pageSheet" : "fullScreen"} onRequestClose={() => setShowPaymentModal(false)}>
        <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={billsStyles.modalContainer}>
          <SafeAreaView style={billsStyles.modalContainer}>
            <StatusBar barStyle="dark-content" />
            <View style={billsStyles.modalHeader}>
              <Text style={billsStyles.modalTitle}>Update Payment</Text>
              <TouchableOpacity style={billsStyles.closeButton} onPress={() => setShowPaymentModal(false)} activeOpacity={0.7}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={billsStyles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedBill && (
                <View style={billsStyles.paymentForm}>
                  <View style={billsStyles.billSummary}>
                    <Text style={billsStyles.summaryLabel}>Bill Summary</Text>
                    <Text style={billsStyles.summaryBill}>{selectedBill.billNumber}</Text>
                    <Text style={billsStyles.summaryAmount}>{formatCurrency(selectedBill.totalAmount)}</Text>
                    <Text style={billsStyles.summaryClient}>{selectedBill.Client?.fullname}</Text>
                  </View>

                  <Text style={billsStyles.inputLabel}>Payment Method *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={billsStyles.methodScroll}>
                    {paymentMethods.map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[billsStyles.methodOption, paymentData.paymentMethod === method && billsStyles.methodSelected]}
                        onPress={() => setPaymentData({...paymentData, paymentMethod: method})}
                        activeOpacity={0.7}
                      >
                        <Text style={[billsStyles.methodText, paymentData.paymentMethod === method && billsStyles.methodTextSelected]}>
                          {method}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  <Text style={billsStyles.inputLabel}>Transaction ID (Optional)</Text>
                  <TextInput
                    style={billsStyles.textInput}
                    value={paymentData.transactionId}
                    onChangeText={(text) => setPaymentData({...paymentData, transactionId: text})}
                    placeholder="Enter transaction ID or reference number"
                    placeholderTextColor="#999"
                  />
                  
                  <Text style={billsStyles.inputLabel}>Payment Notes (Optional)</Text>
                  <TextInput
                    style={[billsStyles.textInput, billsStyles.textArea]}
                    value={paymentData.paymentNotes}
                    onChangeText={(text) => setPaymentData({...paymentData, paymentNotes: text})}
                    placeholder="Additional notes about the payment..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  
                  <TouchableOpacity
                    style={[billsStyles.submitButton, submittingPayment && billsStyles.disabledButton]}
                    onPress={submitPaymentUpdate}
                    disabled={submittingPayment}
                    activeOpacity={0.7}
                  >
                    {submittingPayment ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon name="check" size={20} color="#fff" />
                        <Text style={billsStyles.submitButtonText}>Mark as Paid</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const billsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666', fontWeight: '500' },
  header: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: isIOS ? 16 : 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 4 } }),
  },
  backButton: { padding: 8, marginRight: 16 },
  headerContent: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    ...Platform.select({ ios: { fontFamily: 'System' }, android: { fontFamily: 'Roboto' } }),
  },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  statsContainer: { backgroundColor: '#ffffff', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  statsContent: { paddingHorizontal: 16 },
  statCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 3,
    minWidth: 100,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, android: { elevation: 2 } }),
  },
  statIcon: { marginBottom: 8 },
  statNumber: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '500', textAlign: 'center' },
  listContainer: { padding: 16 },
  billCardWrapper: { marginBottom: 12 },
  billCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billInfo: { flex: 1 },
  billNumberContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  billNumber: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 },
  clientName: { fontSize: 14, color: '#666', marginBottom: 4 },
  billDate: { fontSize: 12, color: '#999' },
  billAmount: { alignItems: 'flex-end' },
  amountText: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50', marginBottom: 8 },
  billFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  materialName: { flex: 1, fontSize: 14, color: '#666' },
  updateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  updateButtonText: { fontSize: 12, color: '#4CAF50', fontWeight: '600', marginLeft: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statuspending: { backgroundColor: '#FFF3E0' },
  statussuccessful: { backgroundColor: '#E8F5E8' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#333' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 16, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  modalContainer: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#ffffff',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeButton: { padding: 8 },
  modalContent: { flex: 1, backgroundColor: '#f8f9fa' },
  paymentForm: {
    margin: 16,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  billSummary: { backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12, marginBottom: 24, alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  summaryBill: { fontSize: 16, fontWeight: '600', color: '#333' },
  summaryAmount: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50', marginVertical: 4 },
  summaryClient: { fontSize: 14, color: '#666' },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  methodScroll: { marginBottom: 20 },
  methodOption: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f8f9fa', borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  methodSelected: { backgroundColor: '#E8F5E8', borderColor: '#4CAF50' },
  methodText: { fontSize: 14, color: '#666', fontWeight: '500' },
  methodTextSelected: { color: '#4CAF50', fontWeight: '600' },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    ...Platform.select({ ios: { fontFamily: 'System' }, android: { fontFamily: 'Roboto' } }),
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, android: { elevation: 4 } }),
  },
  disabledButton: { backgroundColor: '#CCC' },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});

export default AdminBillsScreen;