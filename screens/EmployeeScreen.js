import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import axios from 'axios';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';

const EmployeeScreen = () => {
  const [uploading, setUploading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Employee details state
  const [employeeDetails, setEmployeeDetails] = useState({
    name: '',
    shopHouseNo: '',
    pincode: '',
    phoneNumber: '',
    currentLocation: null,
    photos: [],
    videos: [],
  });

  useEffect(() => {
    requestLocationPermission();
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

  // Get current location
  const getCurrentLocation = () => {
    setLocationLoading(true);
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setEmployeeDetails(prev => ({
          ...prev,
          currentLocation: {
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
          }
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

  // Select media for employee details
  const selectEmployeeMedia = (type) => {
    Alert.alert(
      `Select ${type === 'photo' ? 'Photo' : 'Video'}`,
      'Choose an option',
      [
        { text: 'Camera', onPress: () => openEmployeeCamera(type) },
        { text: 'Gallery', onPress: () => openEmployeeGallery(type) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openEmployeeCamera = (type) => {
    const options = {
      mediaType: type === 'photo' ? 'photo' : 'video',
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
        const mediaField = type === 'photo' ? 'photos' : 'videos';
        setEmployeeDetails(prev => ({
          ...prev,
          [mediaField]: [...prev[mediaField], response.assets[0]]
        }));
      }
    });
  };

  const openEmployeeGallery = (type) => {
    const options = {
      mediaType: type === 'photo' ? 'photo' : 'video',
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
        const mediaField = type === 'photo' ? 'photos' : 'videos';
        setEmployeeDetails(prev => ({
          ...prev,
          [mediaField]: [...prev[mediaField], response.assets[0]]
        }));
      }
    });
  };

  // Remove media from employee details
  const removeEmployeeMedia = (type, index) => {
    const mediaField = type === 'photo' ? 'photos' : 'videos';
    setEmployeeDetails(prev => ({
      ...prev,
      [mediaField]: prev[mediaField].filter((_, i) => i !== index)
    }));
  };

  // Submit employee details
  const submitEmployeeDetails = async () => {
    // Validate required fields
    if (!employeeDetails.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!employeeDetails.shopHouseNo.trim()) {
      Alert.alert('Error', 'Please enter shop/house number');
      return;
    }
    if (!employeeDetails.pincode.trim()) {
      Alert.alert('Error', 'Please enter pincode');
      return;
    }
    if (!employeeDetails.phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }
    if (!employeeDetails.currentLocation) {
      Alert.alert('Error', 'Please capture your current location');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      
      // Add text fields
      formData.append('name', employeeDetails.name);
      formData.append('shopHouseNo', employeeDetails.shopHouseNo);
      formData.append('pincode', employeeDetails.pincode);
      formData.append('phoneNumber', employeeDetails.phoneNumber);
      formData.append('currentLocation', JSON.stringify(employeeDetails.currentLocation));

      // Add photos
      employeeDetails.photos.forEach((photo, index) => {
        formData.append(`photo_${index}`, {
          uri: photo.uri,
          type: photo.type,
          name: photo.fileName || `photo_${index}.jpg`,
        });
      });

      // Add videos
      employeeDetails.videos.forEach((video, index) => {
        formData.append(`video_${index}`, {
          uri: video.uri,
          type: video.type,
          name: video.fileName || `video_${index}.mp4`,
        });
      });

      // Submit to server
      const response = await axios.post(
        'http://192.168.1.15:3000/employee_details',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Employee details response:', response.data);
      Alert.alert('Success', 'Employee details submitted successfully!');
      
      // Reset form
      setEmployeeDetails({
        name: '',
        shopHouseNo: '',
        pincode: '',
        phoneNumber: '',
        currentLocation: null,
        photos: [],
        videos: [],
      });

    } catch (error) {
      console.error('Error submitting employee details:', error);
      Alert.alert('Error', 'Failed to submit details. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Employee Details</Text>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Name Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Name *</Text>
          <TextInput
            style={styles.textInput}
            value={employeeDetails.name}
            onChangeText={(text) => setEmployeeDetails(prev => ({ ...prev, name: text }))}
            placeholder="Enter your full name"
          />
        </View>

        {/* Shop/House Number Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Shop/House Number *</Text>
          <TextInput
            style={styles.textInput}
            value={employeeDetails.shopHouseNo}
            onChangeText={(text) => setEmployeeDetails(prev => ({ ...prev, shopHouseNo: text }))}
            placeholder="Enter shop or house number"
          />
        </View>

        {/* Pincode Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Pincode *</Text>
          <TextInput
            style={styles.textInput}
            value={employeeDetails.pincode}
            onChangeText={(text) => setEmployeeDetails(prev => ({ ...prev, pincode: text }))}
            placeholder="Enter pincode"
            keyboardType="numeric"
            maxLength={6}
          />
        </View>

        {/* Phone Number Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.textInput}
            value={employeeDetails.phoneNumber}
            onChangeText={(text) => setEmployeeDetails(prev => ({ ...prev, phoneNumber: text }))}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Current Location */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Current Location *</Text>
          <TouchableOpacity
            style={[styles.button, styles.locationButton]}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {employeeDetails.currentLocation ? 'Update Location' : 'Get Current Location'}
              </Text>
            )}
          </TouchableOpacity>
          {employeeDetails.currentLocation && (
            <Text style={styles.locationText}>
              ✓ Location captured: {employeeDetails.currentLocation.latitude.toFixed(6)}, {employeeDetails.currentLocation.longitude.toFixed(6)}
            </Text>
          )}
        </View>

        {/* Photos Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Photos</Text>
          <TouchableOpacity
            style={[styles.button, styles.mediaButton]}
            onPress={() => selectEmployeeMedia('photo')}
          >
            <Text style={styles.buttonText}>Add Photo</Text>
          </TouchableOpacity>
          <View style={styles.mediaContainer}>
            {employeeDetails.photos.map((photo, index) => (
              <View key={index} style={styles.mediaItem}>
                <Image source={{ uri: photo.uri }} style={styles.mediaPreview} />
                <TouchableOpacity
                  style={styles.removeMediaButton}
                  onPress={() => removeEmployeeMedia('photo', index)}
                >
                  <Text style={styles.removeMediaText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Videos Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Videos</Text>
          <TouchableOpacity
            style={[styles.button, styles.mediaButton]}
            onPress={() => selectEmployeeMedia('video')}
          >
            <Text style={styles.buttonText}>Add Video</Text>
          </TouchableOpacity>
          <View style={styles.mediaContainer}>
            {employeeDetails.videos.map((video, index) => (
              <View key={index} style={styles.mediaItem}>
                <View style={styles.videoPreview}>
                  <Text style={styles.videoText}>📹 Video {index + 1}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeMediaButton}
                  onPress={() => removeEmployeeMedia('video', index)}
                >
                  <Text style={styles.removeMediaText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={submitEmployeeDetails}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Details</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EmployeeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0f7fa',
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00796b',
    textAlign: 'center',
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  locationButton: {
    backgroundColor: '#9c27b0',
    marginBottom: 8,
  },
  mediaButton: {
    backgroundColor: '#607d8b',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#4caf50',
    marginTop: 16,
    marginBottom: 32,
    paddingVertical: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  mediaItem: {
    position: 'relative',
    margin: 5,
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  videoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});