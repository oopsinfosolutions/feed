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
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const API_BASE_URL = 'http://192.168.1.22:3000';

const AdminFeedbackScreen = ({ navigation }) => {
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    resolved: 0,
    recent: 0,
    averageRating: 0,
    ratingDistribution: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    rating: 'all',
    search: ''
  });

  useEffect(() => {
    loadFeedbackData();
    loadStats();
  }, [filters]);

  const loadFeedbackData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.rating !== 'all') params.append('rating', filters.rating);
      if (filters.search) params.append('search', filters.search);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/feedback?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer dummy-token',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeedback(data.data.feedback);
        } else {
          Alert.alert('Error', data.message || 'Failed to fetch feedback');
        }
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
      const response = await fetch(`${API_BASE_URL}/api/admin/feedback/stats`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer dummy-token',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
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
      const response = await fetch(
        `${API_BASE_URL}/api/admin/feedback/${selectedFeedback.id}/respond`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer dummy-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            adminResponse: adminResponse.trim(),
            status: 'reviewed',
            respondedBy: 1 // Replace with actual admin ID
          })
        }
      );

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
    }
  };

  const updateFeedbackStatus = async (feedbackId, newStatus) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/feedback/${feedbackId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer dummy-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Alert.alert('Success', 'Status updated successfully');
          setShowDetailModal(false);
          loadFeedbackData();
          loadStats();
        } else {
          Alert.alert('Error', data.message || 'Failed to update status');
        }
      } else {
        Alert.alert('Error', 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ffc107';
      case 'reviewed':
        return '#17a2b8';
      case 'resolved':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'schedule';
      case 'reviewed':
        return 'visibility';
      case 'resolved':
        return 'check-circle';
      default:
        return 'help';
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return '#28a745';
    if (rating >= 3) return '#ffc107';
    return '#dc3545';
  };

  const StarDisplay = ({ rating }) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name={star <= rating ? 'star' : 'star-border'}
            size={16}
            color={star <= rating ? '#FFD700' : '#DDD'}
          />
        ))}
        <Text style={[styles.ratingNumber, { color: getRatingColor(rating) }]}>
          {rating}/5
        </Text>
      </View>
    );
  };

  const renderStatsCard = (title, value, icon, color, subtitle) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsCardContent}>
        <View style={styles.statsTextContainer}>
          <Text style={styles.statsValue}>{value}</Text>
          <Text style={styles.statsTitle}>{title}</Text>
          {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
        </View>
        <View style={[styles.statsIcon, { backgroundColor: color }]}>
          <Icon name={icon} size={24} color="#fff" />
        </View>
      </View>
    </View>
  );

  const renderFilterSection = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>
        <Icon name="filter-list" size={20} color="#333" /> Filters
      </Text>
      
      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {['all', 'pending', 'reviewed', 'resolved'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filters.status === status && styles.activeFilterButton
                ]}
                onPress={() => setFilters(prev => ({ ...prev, status }))}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.status === status && styles.activeFilterButtonText
                ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Rating:</Text>
          <View style={styles.filterButtons}>
            {['all', '5', '4', '3', '2', '1'].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.filterButton,
                  filters.rating === rating && styles.activeFilterButton
                ]}
                onPress={() => setFilters(prev => ({ ...prev, rating }))}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.rating === rating && styles.activeFilterButtonText
                ]}>
                  {rating === 'all' ? 'All' : `${rating}★`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search feedback comments or client names..."
          value={filters.search}
          onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
          placeholderTextColor="#999"
        />
        {filters.search && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setFilters(prev => ({ ...prev, search: '' }))}
          >
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFeedbackItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.feedbackCard}
      onPress={() => handleFeedbackPress(item)}
    >
      <View style={styles.feedbackHeader}>
        <View style={styles.feedbackHeaderLeft}>
          <View style={styles.clientInfo}>
            <Icon name="account-circle" size={20} color="#007bff" />
            <Text style={styles.clientName}>{item.Client?.fullname || 'Unknown Client'}</Text>
          </View>
          <Text style={styles.billNumber}>
            <Icon name="receipt" size={16} color="#666" />
            {item.Bill?.billNumber || 'N/A'}
          </Text>
        </View>
        <View style={styles.feedbackHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Icon name={getStatusIcon(item.status)} size={14} color="#fff" />
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.feedbackContent}>
        <View style={styles.ratingRow}>
          <StarDisplay rating={item.rating} />
          <Text style={styles.feedbackDate}>
            {new Date(item.submittedAt).toLocaleDateString()}
          </Text>
        </View>
        
        <Text style={styles.feedbackComments} numberOfLines={2}>
          {item.comments}
        </Text>
        
        {item.improvementSuggestions && (
          <Text style={styles.improvementSuggestions} numberOfLines={1}>
            <Icon name="lightbulb-outline" size={16} color="#ffc107" />
            {item.improvementSuggestions}
          </Text>
        )}
      </View>

      <View style={styles.feedbackActions}>
        {item.adminResponse ? (
          <View style={styles.responseIndicator}>
            <Icon name="reply" size={16} color="#28a745" />
            <Text style={styles.responseText}>Response provided</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.respondButton}
            onPress={(e) => {
              e.stopPropagation();
              handleRespondPress(item);
            }}
          >
            <Icon name="reply" size={16} color="#007bff" />
            <Text style={styles.respondButtonText}>Respond</Text>
          </TouchableOpacity>
        )}
        
        <Icon name="chevron-right" size={20} color="#007bff" />
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
        <View style={styles.headerContent}>
          <Icon name="feedback" size={24} color="#fff" />
          <Text style={styles.headerTitle}>Customer Feedback</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => Alert.alert('Export', 'Export functionality can be implemented here')}
        >
          <Icon name="file-download" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>
            <Icon name="analytics" size={20} color="#333" /> Overview
          </Text>
          <View style={styles.statsGrid}>
            {renderStatsCard('Total Feedback', stats.total, 'feedback', '#007bff')}
            {renderStatsCard('Pending', stats.pending, 'schedule', '#ffc107')}
            {renderStatsCard('Reviewed', stats.reviewed, 'visibility', '#17a2b8')}
            {renderStatsCard('Resolved', stats.resolved, 'check-circle', '#28a745')}
          </View>
          <View style={styles.statsGrid}>
            {renderStatsCard('Average Rating', stats.averageRating, 'star', '#FFD700', '/ 5.0')}
            {renderStatsCard('Recent (7 days)', stats.recent, 'trending-up', '#6f42c1')}
          </View>
        </View>

        {renderFilterSection()}

        {/* Feedback List */}
        <View style={styles.feedbackSection}>
          <Text style={styles.sectionTitle}>
            <Icon name="comment" size={20} color="#333" /> 
            Feedback ({feedback.length})
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={styles.loadingText}>Loading feedback...</Text>
            </View>
          ) : feedback.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="feedback" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No feedback found</Text>
              <Text style={styles.emptyStateSubtext}>
                Customer feedback will appear here once submitted
              </Text>
            </View>
          ) : (
            <FlatList
              data={feedback}
              renderItem={renderFeedbackItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Feedback Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Icon name="feedback" size={24} color="#333" />
              <Text style={styles.modalTitle}>Feedback Details</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedFeedback && (
              <>
                {/* Client Information */}
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Icon name="account-circle" size={20} color="#007bff" />
                    <Text style={styles.detailSectionTitle}>Client Information</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>
                      {selectedFeedback.Client?.fullname || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedFeedback.Client?.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{selectedFeedback.Client?.phone || 'N/A'}</Text>
                  </View>
                </View>

                {/* Bill Information */}
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Icon name="receipt" size={20} color="#007bff" />
                    <Text style={styles.detailSectionTitle}>Bill Information</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bill Number:</Text>
                    <Text style={styles.detailValue}>{selectedFeedback.Bill?.billNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Material:</Text>
                    <Text style={styles.detailValue}>{selectedFeedback.Bill?.materialName || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount:</Text>
                    <Text style={styles.detailValue}>
                      ₹{parseFloat(selectedFeedback.Bill?.totalAmount || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Feedback Details */}
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Icon name="star" size={20} color="#FFD700" />
                    <Text style={styles.detailSectionTitle}>Feedback</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Rating:</Text>
                    <StarDisplay rating={selectedFeedback.rating} />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedFeedback.status) }]}>
                      <Icon name={getStatusIcon(selectedFeedback.status)} size={14} color="#fff" />
                      <Text style={styles.statusText}>{selectedFeedback.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Submitted:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedFeedback.submittedAt).toLocaleDateString()} at{' '}
                      {new Date(selectedFeedback.submittedAt).toLocaleTimeString()}
                    </Text>
                  </View>
                  
                  <View style={styles.commentsSection}>
                    <Text style={styles.detailLabel}>Comments:</Text>
                    <Text style={styles.commentsText}>{selectedFeedback.comments}</Text>
                  </View>
                  
                  {selectedFeedback.improvementSuggestions && (
                    <View style={styles.commentsSection}>
                      <Text style={styles.detailLabel}>Improvement Suggestions:</Text>
                      <Text style={styles.commentsText}>{selectedFeedback.improvementSuggestions}</Text>
                    </View>
                  )}
                </View>

                {/* Admin Response Section */}
                {selectedFeedback.adminResponse && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Icon name="admin-panel-settings" size={20} color="#28a745" />
                      <Text style={styles.detailSectionTitle}>Admin Response</Text>
                    </View>
                    <View style={styles.responseSection}>
                      <Text style={styles.responseText}>{selectedFeedback.adminResponse}</Text>
                      {selectedFeedback.respondedAt && (
                        <Text style={styles.responseDate}>
                          Responded on {new Date(selectedFeedback.respondedAt).toLocaleDateString()} at{' '}
                          {new Date(selectedFeedback.respondedAt).toLocaleTimeString()}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  {!selectedFeedback.adminResponse && (
                    <TouchableOpacity
                      style={styles.respondActionButton}
                      onPress={() => {
                        setShowDetailModal(false);
                        setTimeout(() => handleRespondPress(selectedFeedback), 300);
                      }}
                    >
                      <Icon name="reply" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Respond to Feedback</Text>
                    </TouchableOpacity>
                  )}

                  {selectedFeedback.status !== 'resolved' && (
                    <TouchableOpacity
                      style={styles.resolveActionButton}
                      onPress={() => updateFeedbackStatus(selectedFeedback.id, 'resolved')}
                    >
                      <Icon name="check-circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Mark as Resolved</Text>
                    </TouchableOpacity>
                  )}

                  {selectedFeedback.status === 'resolved' && (
                    <TouchableOpacity
                      style={styles.reopenActionButton}
                      onPress={() => updateFeedbackStatus(selectedFeedback.id, 'reviewed')}
                    >
                      <Icon name="refresh" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Reopen Feedback</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView style={styles.responseModalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Icon name="reply" size={24} color="#333" />
              <Text style={styles.modalTitle}>Respond to Feedback</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowResponseModal(false)}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.responseForm}>
            {selectedFeedback && (
              <>
                {/* Feedback Summary */}
                <View style={styles.feedbackSummary}>
                  <Text style={styles.summaryTitle}>Original Feedback:</Text>
                  <View style={styles.summaryContent}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Client:</Text>
                      <Text style={styles.summaryValue}>{selectedFeedback.Client?.fullname}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Rating:</Text>
                      <StarDisplay rating={selectedFeedback.rating} />
                    </View>
                    <Text style={styles.summaryComments}>{selectedFeedback.comments}</Text>
                  </View>
                </View>

                {/* Response Input */}
                <View style={styles.responseInputContainer}>
                  <Text style={styles.responseInputLabel}>Your Response *</Text>
                  <View style={styles.responseInputWrapper}>
                    <Icon name="message" size={20} color="#666" style={styles.responseInputIcon} />
                    <TextInput
                      style={styles.responseTextInput}
                      value={adminResponse}
                      onChangeText={setAdminResponse}
                      placeholder="Provide a helpful response to the customer's feedback..."
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                {/* Response Templates */}
                <View style={styles.templatesContainer}>
                  <Text style={styles.templatesTitle}>Quick Response Templates:</Text>
                  <View style={styles.templateButtons}>
                    <TouchableOpacity
                      style={styles.templateButton}
                      onPress={() => setAdminResponse("Thank you for your valuable feedback. We appreciate your input and will work to improve our services.")}
                    >
                      <Text style={styles.templateButtonText}>Thank You</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.templateButton}
                      onPress={() => setAdminResponse("We sincerely apologize for any inconvenience caused. We are taking immediate steps to address this issue.")}
                    >
                      <Text style={styles.templateButtonText}>Apology</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.templateButton}
                      onPress={() => setAdminResponse("Thank you for the positive feedback! We're glad you had a great experience with our service.")}
                    >
                      <Text style={styles.templateButtonText}>Positive Response</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitResponseButton}
                  onPress={submitResponse}
                >
                  <Icon name="send" size={20} color="#fff" />
                  <Text style={styles.submitResponseText}>Send Response</Text>
                </TouchableOpacity>

                <View style={styles.responseNote}>
                  <Icon name="info" size={16} color="#666" />
                  <Text style={styles.responseNoteText}>
                    Your response will be visible to the customer and will help improve their experience.
                  </Text>
                </View>
              </>
            )}
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
  header: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20
  },
  backButton: {
    padding: 8
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8
  },
  exportButton: {
    padding: 8
  },
  scrollView: {
    flex: 1
  },
  statsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4
  },
  statsCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statsTextContainer: {
    flex: 1
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  statsTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  statsSubtitle: {
    fontSize: 10,
    color: '#999'
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  filterRow: {
    marginBottom: 15
  },
  filterGroup: {
    flex: 1
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff'
  },
  activeFilterButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff'
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666'
  },
  activeFilterButtonText: {
    color: '#fff'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333'
  },
  clearSearchButton: {
    padding: 4
  },
  feedbackSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40
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
  feedbackCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  feedbackHeaderLeft: {
    flex: 1
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8
  },
  billNumber: {
    fontSize: 12,
    color: '#666',
    marginLeft: 28
  },
  feedbackHeaderRight: {
    alignItems: 'flex-end'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  feedbackContent: {
    marginBottom: 10
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  ratingNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8
  },
  feedbackDate: {
    fontSize: 12,
    color: '#666'
  },
  feedbackComments: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8
  },
  improvementSuggestions: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 20
  },
  feedbackActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  responseText: {
    fontSize: 12,
    color: '#28a745',
    marginLeft: 4,
    fontWeight: '500'
  },
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007bff',
    borderRadius: 15
  },
  respondButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4
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
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8
  },
  closeButton: {
    padding: 5
  },
  modalContent: {
    flex: 1,
    padding: 20
  },
  detailSection: {
    marginBottom: 25
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8
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
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10
  },
  commentsSection: {
    marginTop: 10
  },
  commentsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginTop: 5,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  responseSection: {
    padding: 15,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745'
  },
  responseDate: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  },
  actionButtonsContainer: {
    gap: 15,
    marginTop: 20
  },
  respondActionButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10
  },
  resolveActionButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10
  },
  reopenActionButton: {
    backgroundColor: '#ffc107',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  responseModalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  responseForm: {
    flex: 1,
    padding: 20
  },
  feedbackSummary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  summaryContent: {
    gap: 8
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666'
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  summaryComments: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    marginTop: 8,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5
  },
  responseInputContainer: {
    marginBottom: 20
  },
  responseInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10
  },
  responseInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12
  },
  responseInputIcon: {
    marginRight: 8,
    marginTop: 2
  },
  responseTextInput: {
    flex: 1,
    minHeight: 120,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    paddingVertical: 0
  },
  templatesContainer: {
    marginBottom: 20
  },
  templatesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10
  },
  templateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  templateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  templateButtonText: {
    fontSize: 12,
    color: '#495057'
  },
  submitResponseButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10
  },
  submitResponseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  responseNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    gap: 10
  },
  responseNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  }
});

export default AdminFeedbackScreen;