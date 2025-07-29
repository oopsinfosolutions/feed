import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const ClientFeedbackModal = ({ 
  visible, 
  onClose, 
  billData, 
  clientData, 
  onSubmitFeedback 
}) => {
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [serviceQuality, setServiceQuality] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState(0);
  const [productQuality, setProductQuality] = useState(0);
  const [overallSatisfaction, setOverallSatisfaction] = useState(0);
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const resetForm = () => {
    setRating(0);
    setFeedbackText('');
    setServiceQuality(0);
    setDeliveryTime(0);
    setProductQuality(0);
    setOverallSatisfaction(0);
    setRecommendations('');
  };

  const validateForm = () => {
    if (rating === 0) {
      Alert.alert('Validation Error', 'Please provide an overall rating');
      return false;
    }
    
    if (!feedbackText.trim()) {
      Alert.alert('Validation Error', 'Please provide your feedback comments');
      return false;
    }

    if (feedbackText.trim().length < 10) {
      Alert.alert('Validation Error', 'Please provide more detailed feedback (at least 10 characters)');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const feedbackData = {
        clientId: clientData?.id,
        billId: billData?.id,
        orderId: billData?.orderId,
        rating,
        feedbackText: feedbackText.trim(),
        serviceQuality: serviceQuality || null,
        deliveryTime: deliveryTime || null,
        productQuality: productQuality || null,
        overallSatisfaction: overallSatisfaction || null,
        recommendations: recommendations.trim() || null,
      };

      console.log('Submitting feedback:', feedbackData);

      const response = await fetch('http://192.168.1.42:3000/api/client/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          '✅ Thank You!', 
          'Your feedback has been submitted successfully. We appreciate your time and will use your feedback to improve our services.',
          [
            {
              text: 'Close',
              onPress: () => {
                resetForm();
                onClose();
                if (onSubmitFeedback) {
                  onSubmitFeedback(data.data);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to submit feedback');
      }

    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onPress, size = 30, color = '#FFD700' }) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress(star)}
            style={styles.starButton}
          >
            <Icon
              name={star <= value ? 'star' : 'star-border'}
              size={size}
              color={star <= value ? color : '#E5E7EB'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = (rating) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Rate your experience';
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 1: return '#EF4444';
      case 2: return '#F59E0B';
      case 3: return '#10B981';
      case 4: return '#3B82F6';
      case 5: return '#8B5CF6';
      default: return '#9CA3AF';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Icon name="feedback" size={24} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Share Your Feedback</Text>
                <Text style={styles.headerSubtitle}>Help us improve our service</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Icon name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Bill Information */}
            {billData && (
              <View style={styles.billInfoCard}>
                <Text style={styles.sectionTitle}>Order Details</Text>
                <View style={styles.billInfoRow}>
                  <Text style={styles.billInfoLabel}>Bill Number:</Text>
                  <Text style={styles.billInfoValue}>{billData.billNumber}</Text>
                </View>
                <View style={styles.billInfoRow}>
                  <Text style={styles.billInfoLabel}>Material:</Text>
                  <Text style={styles.billInfoValue}>{billData.materialName}</Text>
                </View>
                <View style={styles.billInfoRow}>
                  <Text style={styles.billInfoLabel}>Amount:</Text>
                  <Text style={styles.billInfoValue}>₹{parseFloat(billData.totalAmount || 0).toFixed(2)}</Text>
                </View>
              </View>
            )}

            {/* Overall Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>Overall Rating *</Text>
              <Text style={styles.sectionDescription}>
                How would you rate your overall experience?
              </Text>
              
              <View style={styles.ratingContainer}>
                <StarRating 
                  value={rating} 
                  onPress={setRating}
                  size={40}
                />
                <Text style={[
                  styles.ratingText,
                  { color: getRatingColor(rating) }
                ]}>
                  {getRatingText(rating)}
                </Text>
              </View>
            </View>

            {/* Detailed Ratings */}
            <View style={styles.detailedRatingsSection}>
              <Text style={styles.sectionTitle}>Detailed Ratings</Text>
              <Text style={styles.sectionDescription}>
                Rate specific aspects of our service (optional)
              </Text>

              {/* Service Quality */}
              <View style={styles.ratingItem}>
                <Text style={styles.ratingItemLabel}>Service Quality</Text>
                <StarRating 
                  value={serviceQuality} 
                  onPress={setServiceQuality}
                  size={24}
                />
              </View>

              {/* Delivery Time */}
              <View style={styles.ratingItem}>
                <Text style={styles.ratingItemLabel}>Delivery Time</Text>
                <StarRating 
                  value={deliveryTime} 
                  onPress={setDeliveryTime}
                  size={24}
                />
              </View>

              {/* Product Quality */}
              <View style={styles.ratingItem}>
                <Text style={styles.ratingItemLabel}>Product Quality</Text>
                <StarRating 
                  value={productQuality} 
                  onPress={setProductQuality}
                  size={24}
                />
              </View>

              {/* Overall Satisfaction */}
              <View style={styles.ratingItem}>
                <Text style={styles.ratingItemLabel}>Overall Satisfaction</Text>
                <StarRating 
                  value={overallSatisfaction} 
                  onPress={setOverallSatisfaction}
                  size={24}
                />
              </View>
            </View>

            {/* Feedback Comments */}
            <View style={styles.commentsSection}>
              <Text style={styles.sectionTitle}>Your Comments *</Text>
              <Text style={styles.sectionDescription}>
                Please share your detailed feedback about our service
              </Text>
              
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Tell us about your experience. What did we do well? What can we improve?"
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.characterCount}>
                  {feedbackText.length}/500 characters
                </Text>
              </View>
            </View>

            {/* Recommendations */}
            <View style={styles.recommendationsSection}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              <Text style={styles.sectionDescription}>
                Any suggestions for improvement? (optional)
              </Text>
              
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={[styles.textArea, styles.recommendationsTextArea]}
                  placeholder="Share any suggestions or recommendations for improving our service"
                  value={recommendations}
                  onChangeText={setRecommendations}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.characterCount}>
                  {recommendations.length}/300 characters
                </Text>
              </View>
            </View>

            {/* Quick Feedback Tags */}
            <View style={styles.quickTagsSection}>
              <Text style={styles.sectionTitle}>Quick Feedback</Text>
              <Text style={styles.sectionDescription}>
                Tap what applies to your experience
              </Text>
              
              <View style={styles.tagsContainer}>
                {[
                  { label: 'Fast Delivery', icon: 'local-shipping' },
                  { label: 'Good Quality', icon: 'verified' },
                  { label: 'Professional Service', icon: 'business-center' },
                  { label: 'Fair Pricing', icon: 'attach-money' },
                  { label: 'Easy Process', icon: 'thumb-up' },
                  { label: 'Would Recommend', icon: 'recommend' },
                ].map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.tagButton,
                      feedbackText.includes(tag.label) && styles.tagButtonActive
                    ]}
                    onPress={() => {
                      if (feedbackText.includes(tag.label)) {
                        setFeedbackText(feedbackText.replace(tag.label, '').trim());
                      } else {
                        setFeedbackText(prev => prev + (prev ? ' ' : '') + tag.label);
                      }
                    }}
                  >
                    <Icon 
                      name={tag.icon} 
                      size={16} 
                      color={feedbackText.includes(tag.label) ? '#FFFFFF' : '#6366F1'} 
                    />
                    <Text style={[
                      styles.tagButtonText,
                      feedbackText.includes(tag.label) && styles.tagButtonTextActive
                    ]}>
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <View style={styles.submitButtonContent}>
                {loading ? (
                  <>
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Feedback</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Thank You Note */}
            <View style={styles.thankYouNote}>
              <Icon name="favorite" size={20} color="#EF4444" />
              <Text style={styles.thankYouText}>
                Thank you for taking the time to provide feedback. Your input helps us serve you better!
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  billInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  billInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  billInfoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  billInfoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  ratingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  detailedRatingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ratingItem: {
    marginBottom: 16,
  },
  ratingItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  commentsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textAreaContainer: {
    position: 'relative',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
    minHeight: 120,
  },
  recommendationsTextArea: {
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  recommendationsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickTagsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tagButtonActive: {
    backgroundColor: '#6366F1',
  },
  tagButtonText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
    marginLeft: 4,
  },
  tagButtonTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  thankYouNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  thankYouText: {
    fontSize: 14,
    color: '#7F1D1D',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});

export default ClientFeedbackModal;