import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  StatusBar,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Provider } from 'react-native-paper';

const AdminScreen = () => {
  const navigation = useNavigation();
  
  // State management
  const [dashboardData, setDashboardData] = useState({
    users: { total: 0, clients: 0, employees: 0, pending: 0, approved: 0, rejected: 0 },
    orders: { total: 0, pending: 0, completed: 0, cancelled: 0 },
    bills: { total: 0, pending: 0, successful: 0, totalAmount: 0, pendingAmount: 0 },
    feedback: { total: 0, pending: 0, resolved: 0, avgRating: 0 },
    materials: { total: 0, submitted: 0, approved: 0, rejected: 0 }
  });
  
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  // API base URL
  const API_BASE_URL = 'http://192.168.1.22:3000';

  useEffect(() => {
    initializeAnimations();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const initializeAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all dashboard data in parallel
      const [
        statsResponse,
        approvalsResponse,
        feedbackResponse,
        activitiesResponse
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/approval-stats`),
        fetch(`${API_BASE_URL}/api/admin/pending-approvals?limit=10`),
        fetch(`${API_BASE_URL}/api/feedback/admin?limit=10`),
        fetch(`${API_BASE_URL}/api/admin/dashboard-overview`)
      ]);

      // Process statistics
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setDashboardData(statsData.data);
        }
      }

      // Process pending approvals
      if (approvalsResponse.ok) {
        const approvalsData = await approvalsResponse.json();
        if (approvalsData.success) {
          setPendingApprovals(approvalsData.data.pendingUsers || []);
        }
      }

      // Process feedback
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        if (feedbackData.success) {
          setRecentFeedback(feedbackData.data.feedback || []);
        }
      }

      // Process recent activities
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        if (activitiesData.success) {
          setRecentActivities(activitiesData.data.recentActivities || []);
        }
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleNavigation = (route, params = {}) => {
    if (route === '#') {
      Alert.alert('Coming Soon', 'This feature will be available soon!');
      return;
    }
    navigation.navigate(route, params);
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => navigation.replace('Login') },
      ]
    );
  };

  const handleQuickApproval = async (userId, action) => {
    try {
      const endpoint = action === 'approve' ? 'approve-user' : 'reject-user';
      const response = await fetch(`${API_BASE_URL}/api/admin/${endpoint}/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: 1,
          ...(action === 'reject' && { rejectionReason: 'Quick rejection from dashboard' })
        })
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', `User ${action}d successfully!`);
        loadDashboardData(); // Refresh data
      } else {
        Alert.alert('Error', data.message || `Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      Alert.alert('Error', `Failed to ${action} user`);
    }
  };

  const StatsCard = ({ icon, title, count, color, gradient, onPress, delay = 0, subtitle }) => {
    const cardFadeAnim = new Animated.Value(0);
    const cardSlideAnim = new Animated.Value(30);

    React.useEffect(() => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(cardFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cardSlideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: cardFadeAnim,
            transform: [{ translateY: cardSlideAnim }],
          },
        ]}
      >
        <TouchableOpacity 
          style={[styles.statsCard, { backgroundColor: color }]} 
          onPress={onPress}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: gradient }]}>
              <Ionicons name={icon} size={24} color="#fff" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardCount}>{count.toLocaleString()}</Text>
              <Text style={styles.cardTitle}>{title}</Text>
              {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardSubtext}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const QuickAction = ({ icon, title, color, onPress, badge }) => (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.quickActionContent}>
        <Ionicons name={icon} size={20} color="#fff" />
        <Text style={styles.quickActionText}>{title}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFeedbackItem = ({ item }) => (
    <View style={styles.feedbackItem}>
      <View style={styles.feedbackHeader}>
        <Text style={styles.feedbackClient}>{item.Client?.fullname || 'Unknown Client'}</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= item.rating ? "star" : "star-outline"}
              size={12}
              color="#ffc107"
            />
          ))}
          <Text style={styles.ratingText}>{item.rating}/5</Text>
        </View>
      </View>
      <Text style={styles.feedbackText} numberOfLines={2}>{item.detail}</Text>
      <Text style={styles.feedbackDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderApprovalItem = ({ item }) => (
    <View style={styles.approvalItem}>
      <View style={styles.approvalHeader}>
        <Text style={styles.approvalName}>{item.fullname}</Text>
        <Text style={styles.approvalType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
      </View>
      <Text style={styles.approvalEmail}>{item.email}</Text>
      <View style={styles.approvalActions}>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => handleQuickApproval(item.id, 'approve')}
        >
          <Ionicons name="checkmark" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => handleQuickApproval(item.id, 'reject')}
        >
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderUserStats = () => {
    const userStats = dashboardData.users;
    return (
      <View style={styles.detailStatsContainer}>
        <Text style={styles.modalTitle}>User Statistics</Text>
        <View style={styles.detailStatsGrid}>
          <View style={styles.detailStatItem}>
            <Text style={styles.detailStatValue}>{userStats.total}</Text>
            <Text style={styles.detailStatLabel}>Total Users</Text>
          </View>
          <View style={styles.detailStatItem}>
            <Text style={styles.detailStatValue}>{userStats.clients}</Text>
            <Text style={styles.detailStatLabel}>Clients</Text>
          </View>
          <View style={styles.detailStatItem}>
            <Text style={styles.detailStatValue}>{userStats.employees}</Text>
            <Text style={styles.detailStatLabel}>Employees</Text>
          </View>
          <View style={styles.detailStatItem}>
            <Text style={[styles.detailStatValue, { color: '#ffc107' }]}>{userStats.pending}</Text>
            <Text style={styles.detailStatLabel}>Pending</Text>
          </View>
          <View style={styles.detailStatItem}>
            <Text style={[styles.detailStatValue, { color: '#28a745' }]}>{userStats.approved}</Text>
            <Text style={styles.detailStatLabel}>Approved</Text>
          </View>
          <View style={styles.detailStatItem}>
            <Text style={[styles.detailStatValue, { color: '#dc3545' }]}>{userStats.rejected}</Text>
            <Text style={styles.detailStatLabel}>Rejected</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Provider>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366f1']}
            />
          }
        >
          {/* Header */}
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.adminTitle}>Admin Dashboard</Text>
                <Text style={styles.adminSubtitle}>Welcome back, Admin</Text>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
                <Ionicons name="person-circle-outline" size={32} color="#6366f1" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Main Statistics Cards */}
          <View style={styles.statsContainer}>
            <StatsCard
              icon="people-outline"
              title="Total Users"
              count={dashboardData.users.total}
              color="#6366f1"
              gradient="rgba(99, 102, 241, 0.2)"
              onPress={() => setShowUsersModal(true)}
              subtitle={`${dashboardData.users.pending} pending approval`}
              delay={100}
            />
            <StatsCard
              icon="folder-outline"
              title="Orders"
              count={dashboardData.orders.total}
              color="#10b981"
              gradient="rgba(16, 185, 129, 0.2)"
              onPress={() => handleNavigation('CreateOrder')}
              subtitle={`${dashboardData.orders.pending} pending`}
              delay={200}
            />
            <StatsCard
              icon="receipt-outline"
              title="Bills"
              count={dashboardData.bills.total}
              color="#f59e0b"
              gradient="rgba(245, 158, 11, 0.2)"
              onPress={() => handleNavigation('Bills')}
              subtitle={`₹${dashboardData.bills.totalAmount.toLocaleString()}`}
              delay={300}
            />
            <StatsCard
              icon="chatbubble-outline"
              title="Feedback"
              count={dashboardData.feedback.total}
              color="#ef4444"
              gradient="rgba(239, 68, 68, 0.2)"
              onPress={() => setShowFeedbackModal(true)}
              subtitle={`${dashboardData.feedback.avgRating}/5 avg rating`}
              delay={400}
            />
          </View>

          {/* Quick Actions */}
          <Animated.View 
            style={[
              styles.quickActionsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <QuickAction
                icon="person-add-outline"
                title="User Management"
                color="#6366f1"
                onPress={() => handleNavigation('Users')}
                badge={dashboardData.users.pending > 0 ? dashboardData.users.pending : null}
              />
              <QuickAction
                icon="checkmark-done-outline"
                title="Pending Approvals"
                color="#10b981"
                onPress={() => setShowApprovalsModal(true)}
                badge={pendingApprovals.length > 0 ? pendingApprovals.length : null}
              />
              <QuickAction
                icon="document-text-outline"
                title="Employee Data"
                color="#f59e0b"
                onPress={() => handleNavigation('EmployeeData')}
              />
              <QuickAction
                icon="analytics-outline"
                title="Analytics"
                color="#8b5cf6"
                onPress={() => Alert.alert('Analytics', 'Advanced analytics coming soon!')}
              />
            </View>
          </Animated.View>

          {/* Recent Activities */}
          <Animated.View 
            style={[
              styles.recentSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <View style={styles.recentList}>
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 5).map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Ionicons 
                        name={activity.role === 'admin' ? 'briefcase-outline' : 'person-outline'} 
                        size={16} 
                        color="#6366f1" 
                      />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{activity.name}</Text>
                      <Text style={styles.activitySubtitle}>
                        {activity.role} • {activity.status} • {new Date(activity.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No recent activities</Text>
              )}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Users Modal */}
        <Modal
          visible={showUsersModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Management</Text>
              <TouchableOpacity onPress={() => setShowUsersModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {renderUserStats()}
              <TouchableOpacity
                style={styles.fullManagementButton}
                onPress={() => {
                  setShowUsersModal(false);
                  handleNavigation('Users');
                }}
              >
                <Text style={styles.fullManagementButtonText}>Go to Full User Management</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Feedback Modal */}
        <Modal
          visible={showFeedbackModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recent Feedback</Text>
              <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentFeedback}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderFeedbackItem}
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.noDataText}>No feedback available</Text>
              }
            />
          </SafeAreaView>
        </Modal>

        {/* Approvals Modal */}
        <Modal
          visible={showApprovalsModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pending Approvals</Text>
              <TouchableOpacity onPress={() => setShowApprovalsModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pendingApprovals}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderApprovalItem}
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.noDataText}>No pending approvals</Text>
              }
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  adminSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  profileButton: {
    padding: 8,
  },
  statsContainer: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  cardContainer: {
    marginHorizontal: 10,
    marginVertical: 8,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionContent: {
    alignItems: 'center',
    position: 'relative',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  recentList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  noDataText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    marginTop: 20,
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
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailStatsContainer: {
    marginBottom: 20,
  },
  detailStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailStatItem: {
    width: '31%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  detailStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  detailStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  fullManagementButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  fullManagementButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  feedbackItem: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  approvalItem: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  approvalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  approvalType: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  approvalEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  approvalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  approveBtn: {
    backgroundColor: '#10b981',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminScreen;