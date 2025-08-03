
// File: screens/Admin/AdminFeedbackScreen.js (COMPLETE AND FIXED)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  KeyboardAvoidingView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ENDPOINTS, apiUtils } from '../../config/ApiConfig';

const { width } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

const AdminFeedbackScreen = ({ navigation }) => {
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, reviewed: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadFeedbackData();
    loadStats();
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  const loadFeedbackData = async () => {
    try {
      setLoading(!refreshing);
      const token = await AsyncStorage.getItem('authToken') || 'dummy-token';
      const response = await apiUtils.fetchWithRetry(apiUtils.buildUrl(API_ENDPOINTS.ADMIN_FEEDBACK), {
        method: 'GET',
        headers: apiUtils.getAuthHeaders(token)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeedback(data.data.feedback || []);
        } else {
          Alert.alert('Error', data.message || 'Failed to fetch feedback');
        }
      } else if (response.status === 401) {
        handleAuthError();
      } else {
        Alert.alert('Error', 'Failed to fetch feedback data');
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken') || 'dummy-token';
      const response = await apiUtils.fetchWithRetry(apiUtils.buildUrl(API_ENDPOINTS.ADMIN_FEEDBACK_STATS), {
        method: 'GET',
        headers: apiUtils.getAuthHeaders(token)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleAuthError = () => {
    Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
      {
        text: 'OK',
        onPress: () => {
          AsyncStorage.multiRemove(['authToken', 'user_data']);
          navigation.replace('Login');
        }
      }
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFeedbackData();
    loadStats();
  };

  const handleFeedbackPress = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setShowDetailModal(true);
  };

  const handleRespondPress = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setAdminResponse(feedbackItem.adminResponse || '');
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (!adminResponse.trim()) {
      Alert.alert('Error', 'Please provide a response');
      return;
    }

    try {
      setSubmittingResponse(true);
      const token = await AsyncStorage.getItem('authToken') || 'dummy-token';
      const url = apiUtils.buildUrl(API_ENDPOINTS.ADMIN_FEEDBACK_RESPOND.replace(':id', selectedFeedback.id));
      
      const response = await apiUtils.fetchWithRetry(url, {
        method: 'PATCH',
        headers: apiUtils.getAuthHeaders(token),
        body: JSON.stringify({
          adminResponse: adminResponse.trim(),
          status: 'reviewed',
          respondedBy: 'admin'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Alert.alert('Success', 'Response submitted successfully');
          setShowResponseModal(false);
          setAdminResponse('');
          setSelectedFeedback(null);
          loadFeedbackData();
          loadStats();
        } else {
          Alert.alert('Error', data.message || 'Failed to submit response');
        }
      } else {
        Alert.alert('Error', 'Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const renderStarRating = (rating) => (
    <View style={feedbackStyles.starRating}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon key={star} name="star" size={16} color={star <= rating ? '#FFD700' : '#E0E0E0'} style={{ marginRight: 2 }} />
      ))}
    </View>
  );

  const renderFeedbackItem = ({ item }) => (
    <Animated.View style={[feedbackStyles.feedbackCardWrapper, { opacity: fadeAnim }]}>
      <TouchableOpacity style={feedbackStyles.feedbackCard} onPress={() => handleFeedbackPress(item)} activeOpacity={0.7}>
        <View style={feedbackStyles.feedbackHeader}>
          <View style={feedbackStyles.clientInfo}>
            <View style={feedbackStyles.clientAvatar}>
              <Icon name="person" size={20} color="#4CAF50" />
            </View>
            <View style={feedbackStyles.clientDetails}>
              <Text style={feedbackStyles.clientName}>{item.Client?.fullname || 'Unknown Client'}</Text>
              <Text style={feedbackStyles.feedbackDate}>
                {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
          {renderStarRating(item.rating)}
        </View>
        
        <Text style={feedbackStyles.feedbackText} numberOfLines={2}>{item.detail}</Text>
        
        <View style={feedbackStyles.feedbackFooter}>
          <View style={[feedbackStyles.statusBadge, feedbackStyles[`status${item.status || 'submitted'}`]]}>
            <Text style={feedbackStyles.statusText}>{item.status || 'submitted'}</Text>
          </View>
          
          <TouchableOpacity style={feedbackStyles.respondButton} onPress={() => handleRespondPress(item)} activeOpacity={0.7}>
            <Icon name="reply" size={16} color="#4CAF50" />
            <Text style={feedbackStyles.respondButtonText}>{item.adminResponse ? 'Update' : 'Respond'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStatCard = (title, value, color) => (
    <View style={[feedbackStyles.statCard, { borderLeftColor: color }]}>
      <Text style={[feedbackStyles.statNumber, { color }]}>{value}</Text>
      <Text style={feedbackStyles.statLabel}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={feedbackStyles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={feedbackStyles.loadingContainer}>
          <ActivityIndicator size={isIOS ? "large" : 50} color="#4CAF50" />
          <Text style={feedbackStyles.loadingText}>Loading Feedback...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={feedbackStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={feedbackStyles.header}>
        <TouchableOpacity style={feedbackStyles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={feedbackStyles.headerContent}>
          <Text style={feedbackStyles.headerTitle}>Feedback Center</Text>
          <Text style={feedbackStyles.headerSubtitle}>{stats.total} total • {stats.pending} pending responses</Text>
        </View>
      </View>

      {/* Statistics */}
      <Animated.View style={[feedbackStyles.statsContainer, { opacity: fadeAnim }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={feedbackStyles.statsContent}>
          {renderStatCard('Total', stats.total, '#4CAF50')}
          {renderStatCard('Pending', stats.pending, '#FF9800')}
          {renderStatCard('Reviewed', stats.reviewed, '#2196F3')}
          {renderStatCard('Avg Rating', stats.averageRating.toFixed(1), '#9C27B0')}
        </ScrollView>
      </Animated.View>

      {/* Feedback List */}
      <FlatList
        data={feedback}
        renderItem={renderFeedbackItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={feedbackStyles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} tintColor="#4CAF50" />}
        ListEmptyComponent={
          <Animated.View style={[feedbackStyles.emptyContainer, { opacity: fadeAnim }]}>
            <Icon name="feedback" size={64} color="#E0E0E0" />
            <Text style={feedbackStyles.emptyText}>No feedback found</Text>
            <Text style={feedbackStyles.emptySubtext}>Feedback will appear here when customers submit reviews</Text>
          </Animated.View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" presentationStyle={isIOS ? "pageSheet" : "fullScreen"} onRequestClose={() => setShowDetailModal(false)}>
        <SafeAreaView style={feedbackStyles.modalContainer}>
          <StatusBar barStyle="dark-content" />
          <View style={feedbackStyles.modalHeader}>
            <Text style={feedbackStyles.modalTitle}>Feedback Details</Text>
            <TouchableOpacity style={feedbackStyles.closeButton} onPress={() => setShowDetailModal(false)} activeOpacity={0.7}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedFeedback && (
            <ScrollView style={feedbackStyles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={feedbackStyles.detailCard}>
                <View style={feedbackStyles.detailHeader}>
                  <View style={feedbackStyles.clientAvatarLarge}>
                    <Icon name="person" size={32} color="#4CAF50" />
                  </View>
                  <View style={feedbackStyles.clientDetailsLarge}>
                    <Text style={feedbackStyles.clientNameLarge}>{selectedFeedback.Client?.fullname || 'Unknown Client'}</Text>
                    <Text style={feedbackStyles.clientEmail}>{selectedFeedback.Client?.email || 'No email'}</Text>
                    <Text style={feedbackStyles.feedbackDateLarge}>
                      {new Date(selectedFeedback.createdAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
                
                <View style={feedbackStyles.ratingSection}>
                  <Text style={feedbackStyles.ratingLabel}>Rating</Text>
                  {renderStarRating(selectedFeedback.rating)}
                  <Text style={feedbackStyles.ratingText}>{selectedFeedback.rating} out of 5 stars</Text>
                </View>
                
                <View style={feedbackStyles.feedbackSection}>
                  <Text style={feedbackStyles.sectionLabel}>Feedback</Text>
                  <Text style={feedbackStyles.feedbackDetailText}>{selectedFeedback.detail}</Text>
                </View>
                
                {selectedFeedback.recommendations && (
                  <View style={feedbackStyles.recommendationsSection}>
                    <Text style={feedbackStyles.sectionLabel}>Recommendations</Text>
                    <Text style={feedbackStyles.recommendationsText}>{selectedFeedback.recommendations}</Text>
                  </View>
                )}
                
                {selectedFeedback.adminResponse && (
                  <View style={feedbackStyles.responseSection}>
                    <Text style={feedbackStyles.sectionLabel}>Admin Response</Text>
                    <View style={feedbackStyles.responseCard}>
                      <Text style={feedbackStyles.responseText}>{selectedFeedback.adminResponse}</Text>
                      <Text style={feedbackStyles.responseDate}>
                        Responded on {new Date(selectedFeedback.respondedAt || selectedFeedback.updatedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                )}
                
                <TouchableOpacity
                  style={feedbackStyles.respondActionButton}
                  onPress={() => { setShowDetailModal(false); handleRespondPress(selectedFeedback); }}
                  activeOpacity={0.7}
                >
                  <Icon name="reply" size={20} color="#fff" />
                  <Text style={feedbackStyles.respondActionText}>
                    {selectedFeedback.adminResponse ? 'Update Response' : 'Respond to Feedback'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Response Modal */}
      <Modal visible={showResponseModal} animationType="slide" presentationStyle={isIOS ? "pageSheet" : "fullScreen"} onRequestClose={() => setShowResponseModal(false)}>
        <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={feedbackStyles.modalContainer}>
          <SafeAreaView style={feedbackStyles.modalContainer}>
            <StatusBar barStyle="dark-content" />
            <View style={feedbackStyles.modalHeader}>
              <Text style={feedbackStyles.modalTitle}>Respond to Feedback</Text>
              <TouchableOpacity style={feedbackStyles.closeButton} onPress={() => setShowResponseModal(false)} activeOpacity={0.7}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={feedbackStyles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedFeedback && (
                <>
                  <View style={feedbackStyles.feedbackPreview}>
                    <View style={feedbackStyles.previewHeader}>
                      <Icon name="feedback" size={20} color="#666" />
                      <Text style={feedbackStyles.previewLabel}>Original Feedback</Text>
                    </View>
                    <Text style={feedbackStyles.previewText}>{selectedFeedback.detail}</Text>
                    <View style={feedbackStyles.previewRating}>
                      {renderStarRating(selectedFeedback.rating)}
                      <Text style={feedbackStyles.previewRatingText}>by {selectedFeedback.Client?.fullname}</Text>
                    </View>
                  </View>
                  
                  <View style={feedbackStyles.responseForm}>
                    <Text style={feedbackStyles.inputLabel}>Your Response</Text>
                    <TextInput
                      style={feedbackStyles.responseInput}
                      value={adminResponse}
                      onChangeText={setAdminResponse}
                      placeholder="Write a thoughtful response to address the customer's feedback..."
                      multiline
                      numberOfLines={isIOS ? 8 : 6}
                      textAlignVertical="top"
                      placeholderTextColor="#999"
                    />
                    
                    <TouchableOpacity
                      style={[feedbackStyles.submitButton, submittingResponse && feedbackStyles.disabledButton]}
                      onPress={submitResponse}
                      disabled={submittingResponse}
                      activeOpacity={0.7}
                    >
                      {submittingResponse ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Icon name="send" size={20} color="#fff" />
                          <Text style={feedbackStyles.submitButtonText}>
                            {selectedFeedback?.adminResponse ? 'Update Response' : 'Submit Response'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const feedbackStyles = StyleSheet.create({
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
    minWidth: 80,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, android: { elevation: 2 } }),
  },
  statNumber: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '500' },
  listContainer: { padding: 16 },
  feedbackCardWrapper: { marginBottom: 12 },
  feedbackCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  clientInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  clientAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  clientDetails: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: '#333' },
  feedbackDate: { fontSize: 12, color: '#666', marginTop: 2 },
  starRating: { flexDirection: 'row', alignItems: 'center' },
  feedbackText: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 12 },
  feedbackFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statussubmitted: { backgroundColor: '#FFF3E0' },
  statusreviewed: { backgroundColor: '#E8F5E8' },
  statusresolved: { backgroundColor: '#E3F2FD' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#333' },
  respondButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E8F5E8', borderRadius: 8 },
  respondButtonText: { fontSize: 12, color: '#4CAF50', fontWeight: '600', marginLeft: 4 },
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
  detailCard: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  clientAvatarLarge: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5E8', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  clientDetailsLarge: { flex: 1 },
  clientNameLarge: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  clientEmail: { fontSize: 14, color: '#666', marginTop: 2 },
  feedbackDateLarge: { fontSize: 12, color: '#999', marginTop: 4 },
  ratingSection: { marginBottom: 24, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 12 },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  ratingText: { fontSize: 14, color: '#333', marginTop: 8 },
  feedbackSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  feedbackDetailText: { fontSize: 16, color: '#333', lineHeight: 24, backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12 },
  recommendationsSection: { marginBottom: 24 },
  recommendationsText: { fontSize: 16, color: '#333', lineHeight: 24, backgroundColor: '#f0f8f0', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  responseSection: { marginBottom: 24 },
  responseCard: { backgroundColor: '#e3f2fd', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  responseText: { fontSize: 16, color: '#333', lineHeight: 24 },
  responseDate: { fontSize: 12, color: '#666', marginTop: 8, fontStyle: 'italic' },
  respondActionButton: { backgroundColor: '#4CAF50', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, marginTop: 8 },
  respondActionText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  feedbackPreview: {
    margin: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  previewLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginLeft: 8 },
  previewText: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 12 },
  previewRating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewRatingText: { fontSize: 12, color: '#666' },
  responseForm: {
    margin: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  responseInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: isIOS ? 120 : 100,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    ...Platform.select({ ios: { fontFamily: 'System' }, android: { fontFamily: 'Roboto', textAlignVertical: 'top' } }),
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, android: { elevation: 4 } }),
  },
  disabledButton: { backgroundColor: '#CCC' },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});

export default AdminFeedbackScreen;