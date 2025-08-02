 import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
  import { API_CONFIG, API_ENDPOINTS } from '../config/ApiConfig';

const ClientFeedbackScreen = () => {
  const navigation = useNavigation();
  const [feedback, setFeedback] = useState([]);
  const [filteredFeedback, setFilteredFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [statistics, setStatistics] = useState({ });
     const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');


  useEffect(() => {
    fetchFeedback();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [feedback, searchQuery, statusFilter, ratingFilter]);

  
       const fetchFeedback = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/feedback`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeedback(data.data.feedback);
          setStatistics(data.data.statistics);
        } else {
          Alert.alert('Error', data.message || 'Failed to fetch feedback');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      Alert.alert('Error', 'Failed to fetch feedback. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...feedback];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.detail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Client?.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Client?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(item => item.rating === parseInt(ratingFilter));
    }

    setFilteredFeedback(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeedback();
  };

  const handleFeedbackPress = (item) => {
    setSelectedFeedback(item);
    setShowDetailModal(true);
  };

  const handleRespondToFeedback = (item) => {
    setSelectedFeedback(item);
    setResponseText('');
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (!responseText.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/feedback/respond/${selectedFeedback.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminResponse: responseText.trim(),
          adminId: 1 // Replace with actual admin ID
        })
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Response sent successfully!');
        setShowResponseModal(false);
        fetchFeedback(); // Refresh data
      } else {
        Alert.alert('Error', data.message || 'Failed to send response');
      }
    } catch (error) {
      console.error('Error sending response:', error);
      Alert.alert('Error', 'Failed to send response');
    }
  };

  const updateFeedbackStatus = async (feedbackId, newStatus) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/feedback/status/${feedbackId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          adminId: 1
        })
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', `Feedback marked as ${newStatus}!`);
        fetchFeedback(); // Refresh data
      } else {
        Alert.alert('Error', data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color="#ffc107"
          />
        ))}
      </View>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return '#ffc107';
      case 'resolved': return '#28a745';
      case 'in_progress': return '#007bff';
      default: return '#6c757d';
    }
  };

  const renderFeedbackItem = ({ item }) => (
    <TouchableOpacity
      style={styles.feedbackCard}
      onPress={() => handleFeedbackPress(item)}
    >
      <View style={styles.feedbackHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>
            {item.Client?.fullname || 'Unknown Client'}
          </Text>
          <Text style={styles.clientEmail}>
            {item.Client?.email || 'No email'}
          </Text>
        </View>
        <View style={styles.feedbackMeta}>
          {renderStars(item.rating)}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.feedbackText} numberOfLines={3}>
        {item.detail}
      </Text>
      
      <View style={styles.feedbackFooter}>
        <Text style={styles.feedbackDate}>
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        <View style={styles.actionButtons}>
          {item.status === 'submitted' && (
            <TouchableOpacity
              style={styles.respondButton}
              onPress={() => handleRespondToFeedback(item)}
            >
              <Ionicons name="chatbubble-outline" size={14} color="#fff" />
              <Text style={styles.respondButtonText}>Respond</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStatistics = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Feedback Overview</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statistics.total}</Text>
          <Text style={styles.statLabel}>Total Feedback</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ffc107' }]}>
            {statistics.avgRating.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Avg. Rating</Text>
        </View>
      </View>

      <View style={styles.ratingDistribution}>
        <Text style={styles.distributionTitle}>Rating Distribution</Text>
        {[5, 4, 3, 2, 1].map(rating => (
          <View key={rating} style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>{rating} ⭐</Text>
            <View style={styles.ratingBar}>
              <View
                style={[
                  styles.ratingBarFill,
                  {
                    width: `${statistics.total > 0 
                      ? (statistics.ratingDistribution[rating] / statistics.total) * 100 
                      : 0}%`
                  }
                ]}
              />
            </View>
            <Text style={styles.ratingCount}>
              {statistics.ratingDistribution[rating] || 0}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search feedback..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {['all', 'submitted', 'in_progress', 'resolved'].map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  statusFilter === status && styles.filterButtonActive
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[
                  styles.filterButtonText,
                  statusFilter === status && styles.filterButtonTextActive
                ]}>
                  {status === 'all' ? 'All' : status.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Rating:</Text>
          <View style={styles.filterButtons}>
            {['all', '5', '4', '3', '2', '1'].map(rating => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.filterButton,
                  ratingFilter === rating && styles.filterButtonActive
                ]}
                onPress={() => setRatingFilter(rating)}
              >
                <Text style={[
                  styles.filterButtonText,
                  ratingFilter === rating && styles.filterButtonTextActive
                ]}>
                  {rating === 'all' ? 'All' : `${rating}⭐`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="chatbubbles" size={24} color="#fff" />
          <Text style={styles.headerTitle}>Client Feedback</Text>
        </View>
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007bff']}
          />
        }
      >
        {renderStatistics()}
        {renderFilters()}
        
        <View style={styles.feedbackSection}>
          <Text style={styles.sectionTitle}>
            All Feedback ({filteredFeedback.length})
          </Text>
          
          <FlatList
            data={filteredFeedback}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderFeedbackItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No feedback found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery || statusFilter !== 'all' || ratingFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Feedback will appear here when submitted by clients'
                  }
                </Text>
              </View>
            }
          />
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Ionicons name="chatbubble" size={24} color="#007bff" />
              <Text style={styles.modalTitle}>Feedback Details</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {selectedFeedback && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="person" size={20} color="#007bff" />
                  <Text style={styles.detailSectionTitle}>Client Information</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>
                    {selectedFeedback.Client?.fullname || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>
                    {selectedFeedback.Client?.email || 'Not provided'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="star" size={20} color="#ffc107" />
                  <Text style={styles.detailSectionTitle}>Rating & Status</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Rating:</Text>
                  <View style={styles.detailValueRow}>
                    {renderStars(selectedFeedback.rating)}
                    <Text style={styles.ratingNumber}>
                      {selectedFeedback.rating}/5
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedFeedback.status) }]}>
                    <Text style={styles.statusText}>
                      {selectedFeedback.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Submitted:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedFeedback.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="document-text" size={20} color="#28a745" />
                  <Text style={styles.detailSectionTitle}>Feedback Content</Text>
                </View>
                <View style={styles.feedbackContent}>
                  <Text style={styles.feedbackDetailText}>
                    {selectedFeedback.detail}
                  </Text>
                </View>
                {selectedFeedback.recommendations && (
                  <View style={styles.recommendationsSection}>
                    <Text style={styles.detailLabel}>Recommendations:</Text>
                    <Text style={styles.recommendationsText}>
                      {selectedFeedback.recommendations}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                {selectedFeedback.status === 'submitted' && (
                  <>
                    <TouchableOpacity
                      style={styles.respondActionButton}
                      onPress={() => {
                        setShowDetailModal(false);
                        handleRespondToFeedback(selectedFeedback);
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Send Response</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resolveActionButton}
                      onPress={() => {
                        setShowDetailModal(false);
                        updateFeedbackStatus(selectedFeedback.id, 'resolved');
                      }}
                    >
                      <Ionicons name="checkmark-done" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Mark as Resolved</Text>
                    </TouchableOpacity>
                  </>
                )}
                {selectedFeedback.status === 'resolved' && (
                  <TouchableOpacity
                    style={styles.reopenActionButton}
                    onPress={() => {
                      setShowDetailModal(false);
                      updateFeedbackStatus(selectedFeedback.id, 'submitted');
                    }}
                  >
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Reopen</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.responseModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Response</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowResponseModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.responseForm}>
            {selectedFeedback && (
              <View style={styles.feedbackSummary}>
                <Text style={styles.summaryTitle}>Responding to:</Text>
                <Text style={styles.summaryContent}>
                  {selectedFeedback.Client?.fullname} - {selectedFeedback.rating}⭐ Rating
                </Text>
                <Text style={styles.summaryFeedback}>
                  "{selectedFeedback.detail}"
                </Text>
              </View>
            )}
            
            <View style={styles.responseInputContainer}>
              <Text style={styles.responseInputLabel}>Your Response:</Text>
              <View style={styles.responseInputWrapper}>
                <Ionicons name="chatbubble-outline" size={20} color="#666" style={styles.responseInputIcon} />
                <TextInput
                  style={styles.responseTextInput}
                  multiline
                  placeholder="Type your response to the client..."
                  value={responseText}
                  onChangeText={setResponseText}
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.submitResponseButton}
              onPress={submitResponse}
            >
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitResponseText}>Send Response</Text>
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
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  statCard: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007bff'
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  ratingDistribution: {
    marginTop: 10
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  ratingLabel: {
    width: 40,
    fontSize: 14,
    color: '#333'
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginHorizontal: 10
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#ffc107',
    borderRadius: 4
  },
  ratingCount: {
    width: 30,
    textAlign: 'right',
    fontSize: 14,
    color: '#666'
  },
  filtersContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16
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
  filterRow: {
    gap: 16
  },
  filterGroup: {
    marginBottom: 12
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff'
  },
  filterButtonText: {
    fontSize: 12,
    color: '#495057',
    textTransform: 'capitalize'
  },
  filterButtonTextActive: {
    color: '#fff'
  },
  feedbackSection: {
    paddingHorizontal: 16
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  clientInfo: {
    flex: 1
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  clientEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  feedbackMeta: {
    alignItems: 'flex-end',
    gap: 8
  },
  starsContainer: {
    flexDirection: 'row'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  feedbackText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  feedbackDate: {
    fontSize: 12,
    color: '#666'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8
  },
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4
  },
  respondButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
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
    marginBottom: 24
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
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
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  ratingNumber: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  feedbackContent: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff'
  },
  feedbackDetailText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24
  },
  recommendationsSection: {
    marginTop: 12
  },
  recommendationsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    padding: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 6
  },
  actionButtonsContainer: {
    gap: 12,
    marginTop: 20
  },
  respondActionButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8
  },
  resolveActionButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8
  },
  reopenActionButton: {
    backgroundColor: '#ffc107',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff'
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  summaryContent: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
    marginBottom: 8
  },
  summaryFeedback: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic'
  },
  responseInputContainer: {
    marginBottom: 24
  },
  responseInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  responseInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: '#fff'
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
  submitResponseButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8
  },
  submitResponseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default ClientFeedbackScreen;