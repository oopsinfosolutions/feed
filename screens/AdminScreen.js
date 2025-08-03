// ============================================================================
// COMPLETE PRODUCTION-READY CROSS-PLATFORM ADMIN SYSTEM
// ============================================================================

// File: screens/AdminScreen.js (Main Dashboard - Fixed and Complete)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  Easing
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ENDPOINTS, apiUtils } from '../config/ApiConfig';

const { width } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

const AdminScreen = ({ navigation }) => {
  const [dashboardData, setDashboardData] = useState({
    keyMetrics: { totalUsers: 0, totalOrders: 0, totalRevenue: 0, activeUsers: 0 },
    userStats: { total: 0, pending: 0, approved: 0, rejected: 0 },
    financialStats: { totalRevenue: 0, pendingRevenue: 0, totalBills: 0, paidBills: 0, pendingBills: 0 },
    recentUsers: [],
    recentBills: [],
    systemInfo: { alerts: [], lastUpdated: null }
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      animateIn();
    }, [])
  );

  const animateIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('authToken') || 'dummy-token';

      const response = await apiUtils.fetchWithRetry(
        apiUtils.buildUrl(API_ENDPOINTS.ADMIN_DASHBOARD_OVERVIEW),
        {
          method: 'GET',
          headers: apiUtils.getAuthHeaders(token)
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDashboardData(data.data);
        } else {
          throw new Error(data.message || 'Failed to load dashboard data');
        }
      } else if (response.status === 401) {
        handleAuthError();
        return;
      } else {
        throw new Error(`Server error: ${response.status}`);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error.message);
      showPlatformAlert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showPlatformAlert = (title, message, buttons = []) => {
    Alert.alert(title, message, buttons.length > 0 ? buttons : [{ text: 'OK' }], { cancelable: true });
  };

  const handleAuthError = () => {
    showPlatformAlert('Session Expired', 'Your session has expired. Please login again.', [
      {
        text: 'OK',
        onPress: () => {
          AsyncStorage.multiRemove(['authToken', 'user_data', 'user_id', 'user_type']);
          navigation.replace('Login');
        }
      }
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleNavigation = (route, params = {}) => {
    if (route === '#') {
      showPlatformAlert('Coming Soon', 'This feature will be available soon!');
      return;
    }
    navigation.navigate(route, params);
  };

  const handleLogout = () => {
    showPlatformAlert('Confirm Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['authToken', 'user_data', 'user_id', 'user_type']);
          navigation.replace('Login');
        }
      },
    ]);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const renderMetricCard = (title, value, icon, color) => (
    <Animated.View style={[styles.metricCard, { borderLeftColor: color, opacity: fadeAnim }]}>
      <View style={styles.metricHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </Animated.View>
  );

  const renderQuickAction = (title, icon, color, onPress, badge = null) => (
    <Animated.View style={[styles.quickActionWrapper, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={[styles.quickAction, { backgroundColor: color + '15' }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.quickActionContent}>
          <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
            <Icon name={icon} size={28} color={color} />
            {badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.quickActionText, { color }]}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" translucent={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={isIOS ? "large" : 50} color="#4CAF50" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back, Admin</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#666" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} tintColor="#4CAF50" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Error Display */}
        {error && (
          <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
            <Icon name="error" size={24} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Key Metrics</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard('Total Users', dashboardData.keyMetrics.totalUsers, 'people', '#4CAF50')}
            {renderMetricCard('Active Orders', dashboardData.keyMetrics.totalOrders, 'shopping-cart', '#2196F3')}
            {renderMetricCard('Total Revenue', formatCurrency(dashboardData.keyMetrics.totalRevenue), 'attach-money', '#FF9800')}
            {renderMetricCard('Active Users', dashboardData.keyMetrics.activeUsers, 'verified-user', '#9C27B0')}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {renderQuickAction('User Management', 'people', '#4CAF50', () => handleNavigation('AdminUsers'), dashboardData.userStats.pending)}
            {renderQuickAction('Bills & Payments', 'receipt', '#2196F3', () => handleNavigation('AdminBills'), dashboardData.financialStats.pendingBills)}
            {renderQuickAction('Feedback Center', 'feedback', '#FF9800', () => handleNavigation('AdminFeedback'))}
            {renderQuickAction('Analytics', 'analytics', '#9C27B0', () => handleNavigation('#'))}
          </View>
        </View>

        {/* Statistics Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Statistics Overview</Text>
          
          <Animated.View style={[styles.statCard, { opacity: fadeAnim }]}>
            <View style={styles.statCardHeader}>
              <Icon name="people" size={24} color="#4CAF50" />
              <Text style={styles.statCardTitle}>User Management</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Pending Approvals</Text>
              <Text style={styles.statValue}>{dashboardData.userStats.pending}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Approved Users</Text>
              <Text style={styles.statValue}>{dashboardData.userStats.approved}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Rejected Users</Text>
              <Text style={styles.statValue}>{dashboardData.userStats.rejected}</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.statCard, { opacity: fadeAnim }]}>
            <View style={styles.statCardHeader}>
              <Icon name="account-balance" size={24} color="#2196F3" />
              <Text style={styles.statCardTitle}>Financial Overview</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Pending Revenue</Text>
              <Text style={styles.statValue}>{formatCurrency(dashboardData.financialStats.pendingRevenue)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Bills</Text>
              <Text style={styles.statValue}>{dashboardData.financialStats.totalBills}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Paid Bills</Text>
              <Text style={styles.statValue}>{dashboardData.financialStats.paidBills}</Text>
            </View>
          </Animated.View>
        </View>

        <View style={{ height: isIOS ? 30 : 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: isIOS ? 16 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    ...Platform.select({ ios: { fontFamily: 'System' }, android: { fontFamily: 'Roboto' } }),
  },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  logoutButton: { padding: 8 },
  content: { flex: 1, paddingHorizontal: 16 },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    marginVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: { flex: 1, marginLeft: 12, color: '#C62828', fontSize: 14 },
  retryButton: { backgroundColor: '#F44336', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  section: { marginVertical: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16, paddingHorizontal: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    width: (width - 48) / 2,
    marginBottom: 16,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  metricTitle: { fontSize: 14, color: '#666', flex: 1, fontWeight: '500' },
  metricValue: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickActionWrapper: { width: (width - 48) / 2, marginBottom: 16 },
  quickAction: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  quickActionContent: { position: 'relative', marginBottom: 12 },
  quickActionIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF4444', borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  quickActionText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  statCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statCardTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginLeft: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statLabel: { fontSize: 14, color: '#666', flex: 1 },
  statValue: { fontSize: 16, fontWeight: '600', color: '#333' },
});

export default AdminScreen;