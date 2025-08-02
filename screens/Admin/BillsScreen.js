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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// FIXED: Correct import path
import { API_CONFIG, API_ENDPOINTS } from '../config/ApiConfig';

const BillsScreen = () => {
  const navigation = useNavigation();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalBills: 0,
    pendingBills: 0,
    successfulBills: 0,
    totalAmount: 0,
    pendingAmount: 0
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const navigateToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginForm' }],
    });
  };

  const loadUserData = async () => {
    try {
      console.log('=== Loading user data ===');
      
      const userId = await AsyncStorage.getItem('userId');
      const userType = await AsyncStorage.getItem('userType');
      const userName = await AsyncStorage.getItem('userName');
      const userPhone = await AsyncStorage.getItem('userPhone');

      console.log('Retrieved from storage:', {
        userId,
        userType,
        userName,
        userPhone
      });

      if (!userId) {
        console.log('No user ID found, redirecting to login');
        Alert.alert('Session Expired', 'Please login again.');
        navigateToLogin();
        return;
      }
      
      const parsedUser = {
        id: parseInt(userId),
        type: userType,
        fullname: userName || 'User',
        phone: userPhone
      };
      
      console.log('Constructed user object:', parsedUser);
      
      if (userType && userType !== 'Client' && userType !== 'client' && userType !== 'Customer') {
        console.log('User is not a client, type is:', userType);
        Alert.alert('Access Denied', `This screen is for customers only. Your account type: ${userType}`);
        navigateToLogin();
        return;
      }
      
      setUser(parsedUser);
      console.log('User data set successfully, now fetching bills...');
      
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
      
      const token = await AsyncStorage.getItem('authToken') || 'dummy-token-for-api-calls';
      
      console.log(`Fetching bills for client ID: ${clientId}`);
      console.log(`API_CONFIG.BASE_URL: ${API_CONFIG.BASE_URL}`);
      
      // FIXED: Use correct endpoint format
      const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CLIENT_BILLS}/${clientId}`;
      console.log(`Full URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
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
      } else if (response.status === 404) {
        console.log('404 - Bills endpoint not found');
        Alert.alert('Service Unavailable', 'Bills service is not available. Please contact support.');
      } else if (response.status === 401) {
        console.log('Unauthorized response');
        Alert.alert('Authentication Error', 'Please login again.');
        navigateToLogin();
      } else {
        const errorData = await response.text();
        console.error('HTTP error:', response.status, errorData);
        Alert.alert('Error', `Failed to fetch bills (${response.status}). Please try again later.`);
      }
    } catch (error) {
      console.error('Network error fetching bills:', error);
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
      const token = await AsyncStorage.getItem('authToken') || 'dummy-token-for-api-calls';
      console.log(`Fetching details for bill ID: ${bill.id}`);
      
      // FIXED: Use correct endpoint
      const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CLIENT_BILL_DETAILS}/${bill.id}?clientId=${user.id}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Bill detail response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Bill detail response:', data);
        
        if (data.success) {
          // Handle bill details - you can navigate to a detail screen or show modal
          Alert.alert('Bill Details', JSON.stringify(data.data, null, 2));
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

  const renderBillItem = ({ item }) => (
    <TouchableOpacity style={styles.billItem} onPress={() => handleBillPress(item)}>
      <View style={styles.billHeader}>
        <Text style={styles.billId}>Bill #{item.id}</Text>
        <Text style={[
          styles.status,
          { color: item.paymentStatus === 'successful' ? '#4CAF50' : '#FF9800' }
        ]}>
          {item.paymentStatus}
        </Text>
      </View>
      <Text style={styles.amount}>${item.totalAmount}</Text>
      <Text style={styles.date}>{item.createdAt}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading bills...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bills</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalBills}</Text>
          <Text style={styles.statLabel}>Total Bills</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.pendingBills}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>${stats.totalAmount.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Amount</Text>
        </View>
      </View>

      <FlatList
        data={bills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No bills found</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  billItem: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
});

export default BillsScreen;