import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  PermissionsAndroid,
  Platform,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';

const { width, height } = Dimensions.get('window');

const EmployeeScreen = () => {
  const [uploading, setUploading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  // Toggle states
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [employeeList, setEmployeeList] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Employee details state - Updated to match backend fields
  const [employeeDetails, setEmployeeDetails] = useState({
    name: '',
    phone: '',
    address: '',
    pincode: '',
    latitude: null,
    longitude: null,
    detail: '',
    image1: null,
    image2: null,
    image3: null,
    video1: null,
    video2: null,
    video3: null,
  });

  useEffect(() => {
    requestLocationPermission();
    
    // Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access Required',
            message: 'This app needs to access your location',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Fetch employee details from server - Updated to match backend response
  const fetchEmployeeDetails = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoadingEmployees(true);
      }

      const response = await axios.get('http://192.168.1.22:3000/employee_details');
      
      if (response.data.success) {
        setEmployeeList(response.data.data);
      } else {
        Alert.alert('Error', 'Failed to fetch employee details');
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      Alert.alert('Error', 'Failed to fetch employee details');
    } finally {
      setLoadingEmployees(false);
      setRefreshing(false);
    }
  };

  // Handle toggle view
  const toggleEmployeeView = () => {
    setShowEmployeeList(!showEmployeeList);
    if (!showEmployeeList && employeeList.length === 0) {
      fetchEmployeeDetails(true);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchEmployeeDetails(true);
  };

  // Get current location
  const getCurrentLocation = () => {
    setLocationLoading(true);
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setEmployeeDetails(prev => ({
          ...prev,
          latitude,
          longitude,
        }));
        setLocationLoading(false);
        Alert.alert('Success', 'Location captured successfully!');
      },
      (error) => {
        console.error('Location error:', error);
        setLocationLoading(false);
        Alert.alert('Error', 'Failed to get location. Please check your GPS settings.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // Select media for employee details - Updated to match backend fields
  const selectEmployeeMedia = (field) => {
    const mediaType = field.includes('image') ? 'photo' : 'video';
    Alert.alert(
      `Select ${mediaType === 'photo' ? 'Photo' : 'Video'}`,
      'Choose an option',
      [
        { text: 'Camera', onPress: () => openEmployeeCamera(field, mediaType) },
        { text: 'Gallery', onPress: () => openEmployeeGallery(field, mediaType) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openEmployeeCamera = (field, mediaType) => {
    const options = {
      mediaType: mediaType,
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
      videoQuality: 'medium',
    };

    launchCamera(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        setEmployeeDetails(prev => ({
          ...prev,
          [field]: response.assets[0]
        }));
      }
    });
  };

  const openEmployeeGallery = (field, mediaType) => {
    const options = {
      mediaType: mediaType,
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
      videoQuality: 'medium',
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        setEmployeeDetails(prev => ({
          ...prev,
          [field]: response.assets[0]
        }));
      }
    });
  };

  // Remove media from employee details
  const removeEmployeeMedia = (field) => {
    setEmployeeDetails(prev => ({
      ...prev,
      [field]: null
    }));
  };

  // Validation functions
  const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return false;
    }
    const cleaned = phoneNumber.replace(/\D/g, '');
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(cleaned);
  };

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setEmployeeDetails(prev => ({ ...prev, phone: cleaned }));
    }
  };

  const validatePincode = (pincode) => {
    const cleaned = pincode.replace(/\D/g, '');
    if (cleaned.length <= 6) {
      setEmployeeDetails(prev => ({ ...prev, pincode: cleaned }));
    }
  };

  // Submit employee details - Updated to match backend API
  const submitEmployeeDetails = async () => {
    // Validate required fields
    if (!employeeDetails.name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return;
    }
    if (!employeeDetails.address.trim()) {
      Alert.alert('Validation Error', 'Please enter your address');
      return;
    }
    if (!employeeDetails.pincode.trim() || employeeDetails.pincode.length !== 6) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit pincode');
      return;
    }
    if (!validatePhoneNumber(employeeDetails.phone)) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    if (!employeeDetails.latitude || !employeeDetails.longitude) {
      Alert.alert('Validation Error', 'Please capture your current location');
      return;
    }
    if (!employeeDetails.detail.trim()) {
      Alert.alert('Validation Error', 'Please enter material details');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      
      // Add text fields
      formData.append('name', employeeDetails.name);
      formData.append('phone', employeeDetails.phone);
      formData.append('address', employeeDetails.address);
      formData.append('pincode', employeeDetails.pincode);
      formData.append('latitude', employeeDetails.latitude.toString());
      formData.append('longitude', employeeDetails.longitude.toString());
      formData.append('detail', employeeDetails.detail);

      // Add media files
      ['image1', 'image2', 'image3', 'video1', 'video2', 'video3'].forEach(field => {
        if (employeeDetails[field]) {
          formData.append(field, {
            uri: employeeDetails[field].uri,
            type: employeeDetails[field].type,
            name: employeeDetails[field].fileName || `${field}.${field.includes('image') ? 'jpg' : 'mp4'}`,
          });
        }
      });

      // Submit to server
      const response = await axios.post(
        'http://192.168.1.22:3000/employee_details',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Employee details response:', response.data);
      Alert.alert('Success', 'Employee details submitted successfully!', [
        {
          text: 'Add Another',
          onPress: () => {
            setEmployeeDetails({
              name: '',
              phone: '',
              address: '',
              pincode: '',
              latitude: null,
              longitude: null,
              detail: '',
              image1: null,
              image2: null,
              image3: null,
              video1: null,
              video2: null,
              video3: null,
            });
            // Refresh employee list if showing
            if (showEmployeeList) {
              handleRefresh();
            }
          }
        },
        {
          text: 'OK',
          style: 'default',
          onPress: () => {
            // Refresh employee list if showing
            if (showEmployeeList) {
              handleRefresh();
            }
          }
        }
      ]);

    } catch (error) {
      console.error('Error submitting employee details:', error);
      if (error.code === 'ECONNABORTED') {
        Alert.alert('Timeout Error', 'Request timed out. Please try again.');
      } else if (error.response) {
        Alert.alert('Server Error', error.response.data?.message || 'Server error occurred');
      } else if (error.request) {
        Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  // Render employee list item
  const renderEmployeeItem = ({ item }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeAvatar}>
          <Text style={styles.employeeAvatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '👤'}
          </Text>
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.name || 'N/A'}</Text>
          <Text style={styles.employeePhone}>{item.phone || 'N/A'}</Text>
          <Text style={styles.employeeAddress}>
            {item.address || 'N/A'} - {item.pincode || 'N/A'}
          </Text>
          <Text style={styles.employeeDetail}>{item.detail || 'No details'}</Text>
        </View>
      </View>
      <View style={styles.employeeFooter}>
        <Text style={styles.employeeDate}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
        </Text>
        <Text style={styles.employeeId}>ID: {item.userId || 'N/A'}</Text>
        {item.status && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'submitted': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'approved': return '#3B82F6';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.headerCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.headerSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>👤</Text>
        </View>
        <Text style={styles.title}>Employee Management</Text>
        <Text style={styles.subtitle}>
          {showEmployeeList ? 'View Employee Details' : 'Submit Material Details'}
        </Text>
        
        {/* Toggle Button */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleEmployeeView}
        >
          <Text style={styles.toggleButtonText}>
            {showEmployeeList ? '📝 Add Material' : '📋 View Materials'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderEmployeeListView = () => (
    <Animated.View 
      style={[
        styles.formCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          flex: 1
        }
      ]}
    >
      {/* Employee List */}
      <FlatList
        data={employeeList}
        renderItem={renderEmployeeItem}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        style={[styles.employeeListContainer, { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !loadingEmployees ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No materials found</Text>
              <Text style={styles.emptySubText}>Submit your first material to get started</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.emptyText}>Loading materials...</Text>
            </View>
          )
        }
      />
    </Animated.View>
  );

  const renderFormSection = () => (
    <Animated.View 
      style={[
        styles.formCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.formSection}>
        {/* Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.textInput}
            value={employeeDetails.name}
            onChangeText={(text) => setEmployeeDetails(prev => ({ ...prev, name: text }))}
            placeholder="Enter your full name"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Phone Number Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.textInput}
            value={employeeDetails.phone}
            onChangeText={handlePhoneChange}
            placeholder="Enter 10-digit mobile number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Address Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={styles.textInput}
            value={employeeDetails.address}
            onChangeText={(text) => setEmployeeDetails(prev => ({ ...prev, address: text }))}
            placeholder="Enter your complete address"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Pincode Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Pincode *</Text>
          <TextInput
            style={styles.textInput}
            value={employeeDetails.pincode}
            onChangeText={validatePincode}
            placeholder="Enter 6-digit pincode"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            maxLength={6}
          />
        </View>

        {/* Material Details Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Material Details *</Text>
          <TextInput
            style={[styles.textInput, { height: 80 }]}
            value={employeeDetails.detail}
            onChangeText={(text) => setEmployeeDetails(prev => ({ ...prev, detail: text }))}
            placeholder="Describe the material you're submitting"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Current Location */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Current Location *</Text>
          <TouchableOpacity
            style={[styles.locationButton, locationLoading && styles.buttonDisabled]}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            <View style={styles.buttonContent}>
              {locationLoading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Getting Location...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.buttonIcon}>📍</Text>
                  <Text style={styles.buttonText}>
                    {employeeDetails.latitude && employeeDetails.longitude ? 'Update Location' : 'Get Current Location'}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
          {employeeDetails.latitude && employeeDetails.longitude && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                ✓ Location captured successfully
              </Text>
              <Text style={styles.locationCoords}>
                {employeeDetails.latitude.toFixed(6)}, {employeeDetails.longitude.toFixed(6)}
              </Text>
            </View>
          )}
        </View>

        {/* Media Upload Sections */}
        <View style={styles.mediaSection}>
          <Text style={styles.sectionTitle}>Media Files (Optional)</Text>
          
          {/* Images */}
          <View style={styles.mediaRow}>
            <Text style={styles.mediaLabel}>Images:</Text>
            <View style={styles.mediaButtons}>
              {['image1', 'image2', 'image3'].map((field, index) => (
                <View key={field} style={styles.mediaButtonContainer}>
                  <TouchableOpacity
                    style={[styles.mediaButton, employeeDetails[field] && styles.mediaButtonSelected]}
                    onPress={() => selectEmployeeMedia(field)}
                  >
                    <Text style={styles.mediaButtonText}>
                      {employeeDetails[field] ? `✓ ${index + 1}` : `📷 ${index + 1}`}
                    </Text>
                  </TouchableOpacity>
                  {employeeDetails[field] && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeEmployeeMedia(field)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Videos */}
          <View style={styles.mediaRow}>
            <Text style={styles.mediaLabel}>Videos:</Text>
            <View style={styles.mediaButtons}>
              {['video1', 'video2', 'video3'].map((field, index) => (
                <View key={field} style={styles.mediaButtonContainer}>
                  <TouchableOpacity
                    style={[styles.mediaButton, employeeDetails[field] && styles.mediaButtonSelected]}
                    onPress={() => selectEmployeeMedia(field)}
                  >
                    <Text style={styles.mediaButtonText}>
                      {employeeDetails[field] ? `✓ ${index + 1}` : `🎥 ${index + 1}`}
                    </Text>
                  </TouchableOpacity>
                  {employeeDetails[field] && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeEmployeeMedia(field)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.buttonDisabled]}
          onPress={submitEmployeeDetails}
          disabled={uploading}
        >
          <View style={styles.buttonContent}>
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Submitting...</Text>
              </>
            ) : (
              <>
                <Text style={styles.buttonText}>Submit Material</Text>
                <Text style={styles.buttonIcon}>✓</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Secure • Professional • Reliable</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundGradient} />
      {showEmployeeList ? (
        <View style={styles.scrollContainer}>
          {renderHeader()}
          {renderEmployeeListView()}
          {renderFooter()}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContainer}
        >
          {renderHeader()}
          {renderFormSection()}
          {renderFooter()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default EmployeeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
    backgroundColor: '#6366F1',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    opacity: 0.1,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  headerSection: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  logoText: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 16,
  },
  toggleButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#F59E0B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 20,
  },
  formSection: {
    padding: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  locationButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mediaSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  mediaRow: {
    marginBottom: 16,
  },
  mediaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  mediaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaButtonContainer: {
    position: 'relative',
  },
  mediaButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  mediaButtonSelected: {
    backgroundColor: '#10B981',
  },
  mediaButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonIcon: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FFFFFF',
  },
  locationInfo: {
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  locationCoords: {
    fontSize: 12,
    color: '#374151',
  },
  employeeListContainer: {
    paddingHorizontal: 4,
  },
  employeeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeAvatarText: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '700',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  employeePhone: {
    fontSize: 12,
    color: '#4B5563',
  },
  employeeAddress: {
    fontSize: 12,
    color: '#6B7280',
  },
  employeeDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  employeeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  employeeDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  employeeId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
