import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { launchImageLibrary } from 'react-native-image-picker';

const EmployeeScreen = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [currentShipmentId, setCurrentShipmentId] = useState(null);
  const [uploadImages, setUploadImages] = useState({
    image1: null, // Required
    image2: null, // Optional
    image3: null, // Optional
  });
  const [uploading, setUploading] = useState(false);

  // Fetch shipment data from the server
  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = () => {
    axios
      .get('http://192.168.1.7:3000/shipment')
      .then((response) => {
        setShipments(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching shipment data:', error);
        setLoading(false);
      });
  };

  // Handle button actions and send the update to the server
  const handleAction = (id, status) => {
    Alert.alert(
      'Action Confirmation',
      `Are you sure you want to mark shipment ${id} as "${status}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateShipmentStatus(id, status),
        },
      ]
    );
  };

  const updateShipmentStatus = (id, status) => {
    const payload = { 
      id: String(id),
      status: status 
    };

    console.log('Sending payload:', payload);

    axios.put('http://192.168.1.7:3000/update_status', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        console.log('Update response:', response.data);
        Alert.alert('Success', response.data.message || 'Status updated successfully');
        fetchShipments();
      })
      .catch((error) => {
        console.error('Error updating status:', error);
        
        if (error.response) {
          console.error('Error response:', error.response.data);
          console.error('Error status:', error.response.status);
          Alert.alert('Error', `Failed to update status: ${error.response.data.message || error.response.data}`);
        } else if (error.request) {
          console.error('No response received:', error.request);
          Alert.alert('Error', 'No response from server. Please check your connection.');
        } else {
          console.error('Request setup error:', error.message);
          Alert.alert('Error', 'Failed to update status.');
        }
      });
  };

  // Handle image upload modal
  const handleUploadImages = (shipmentId) => {
    setCurrentShipmentId(shipmentId);
    setUploadImages({
      image1: null,
      image2: null,
      image3: null,
    });
    setUploadModalVisible(true);
  };

  // Select image from gallery
  const selectImage = (imageSlot) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        setUploadImages(prev => ({
          ...prev,
          [imageSlot]: response.assets[0]
        }));
      }
    });
  };

  // Remove selected image
  const removeImage = (imageSlot) => {
    setUploadImages(prev => ({
      ...prev,
      [imageSlot]: null
    }));
  };

  // Submit images and update status
  const submitImages = async () => {
    if (!uploadImages.image1) {
      Alert.alert('Error', 'Please select at least the first image (required)');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      // Change 'shipmentId' to 'id' to match server expectation
      formData.append('id', String(currentShipmentId));

      // Add required image
      formData.append('image1', {
        uri: uploadImages.image1.uri,
        type: uploadImages.image1.type,
        name: uploadImages.image1.fileName || 'image1.jpg',
      });

      // Add optional images if selected
      if (uploadImages.image2) {
        formData.append('image2', {
          uri: uploadImages.image2.uri,
          type: uploadImages.image2.type,
          name: uploadImages.image2.fileName || 'image2.jpg',
        });
      }

      if (uploadImages.image3) {
        formData.append('image3', {
          uri: uploadImages.image3.uri,
          type: uploadImages.image3.type,
          name: uploadImages.image3.fileName || 'image3.jpg',
        });
      }

      console.log('Uploading images for shipment ID:', currentShipmentId);

      // Upload images
      const uploadResponse = await axios.post(
        'http://192.168.1.7:3000/images_update',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Upload response:', uploadResponse.data);

      // Update status to "Waiting to Confirm"
      await updateShipmentStatus(currentShipmentId, 'Waiting to Confirm');

      setUploadModalVisible(false);
      Alert.alert('Success', 'Images uploaded successfully and status updated to Waiting to Confirm!');
      
    } catch (error) {
      console.error('Error uploading images:', error);
      
      if (error.response) {
        console.error('Upload error response:', error.response.data);
        console.error('Upload error status:', error.response.status);
        Alert.alert('Error', `Failed to upload images: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        Alert.alert('Error', 'No response from server. Please check your connection.');
      } else {
        console.error('Request setup error:', error.message);
        Alert.alert('Error', 'Failed to upload images. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  // Helper functions
  const hasBeenPicked = (status) => {
    return status === 'Picked' || status === 'Out for Delivery' || status === 'Waiting to Confirm';
  };

  const isOutForDelivery = (status) => {
    return status === 'Out for Delivery';
  };

  const isWaitingToConfirm = (status) => {
    return status === 'Waiting to Confirm';
  };

  const renderShipment = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image1 }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title}>{item.material_Name}</Text>
        <Text style={styles.details}>Quantity: {item.quantity}</Text>
        <Text style={styles.details}>Price/Unit: {item.price_per_unit}</Text>
        <Text style={styles.details}>Total Price: {item.total_price}</Text>
        <Text style={styles.details}>Destination: {item.destination}</Text>
        <Text style={styles.details}>Current Status: {item.status}</Text>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button, 
              styles.pickedButton,
              hasBeenPicked(item.status) && styles.disabledButton
            ]}
            onPress={() => handleAction(item.id, 'Picked')}
            disabled={hasBeenPicked(item.status)}
          >
            <Text style={styles.buttonText}>
              {hasBeenPicked(item.status) ? 'Picked' : 'Pick'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button, 
              styles.deliveryButton,
              (isOutForDelivery(item.status) || item.status === 'Confirmed' || isWaitingToConfirm(item.status)) && styles.disabledButton
            ]}
            onPress={() => handleAction(item.id, 'Out for Delivery')}
            disabled={isOutForDelivery(item.status) || item.status === 'Confirmed' || isWaitingToConfirm(item.status)}
          >
            <Text style={styles.buttonText}>
              {isOutForDelivery(item.status)
                ? 'Out for Delivery'
                : isWaitingToConfirm(item.status)
                ? 'Waiting to Confirm'
                : 'Mark for Delivery'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Upload Images Button - Only show when status is "Out for Delivery" */}
        {isOutForDelivery(item.status) && (
          <TouchableOpacity
            style={[styles.button, styles.uploadButton, styles.fullWidthButton]}
            onPress={() => handleUploadImages(item.id)}
          >
            <Text style={styles.buttonText}>Upload Delivery Images</Text>
          </TouchableOpacity>
        )}

        {/* Show delivery completion status for "Waiting to Confirm" */}
        {isWaitingToConfirm(item.status) && (
          <View style={[styles.statusIndicator, styles.fullWidthButton]}>
            <Text style={styles.statusText}>✓ Delivery images uploaded - Waiting for confirmation</Text>
          </View>
        )}
      </View>
    </View>
  );

  const confirmedShipments = shipments.filter(
    (shipment) => shipment.status === 'Confirmed' || 
                 shipment.status === 'Picked' || 
                 shipment.status === 'Out for Delivery' ||
                 shipment.status === 'Waiting to Confirm'
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#00796b" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Shipment Details</Text>
      {confirmedShipments.length > 0 ? (
        <FlatList
          data={confirmedShipments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderShipment}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.noDeliveries}>
          <Text style={styles.noDeliveriesText}>No Deliveries Yet</Text>
        </View>
      )}

      {/* Image Upload Modal */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalTitle}>Upload Delivery Images</Text>
              
              {/* Image 1 - Required */}
              <View style={styles.imageUploadSection}>
                <Text style={styles.imageLabel}>Image 1 (Required) *</Text>
                {uploadImages.image1 ? (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: uploadImages.image1.uri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage('image1')}
                    >
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.selectImageButton}
                    onPress={() => selectImage('image1')}
                  >
                    <Text style={styles.selectImageText}>Select Image</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Image 2 - Optional */}
              <View style={styles.imageUploadSection}>
                <Text style={styles.imageLabel}>Image 2 (Optional)</Text>
                {uploadImages.image2 ? (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: uploadImages.image2.uri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage('image2')}
                    >
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.selectImageButton}
                    onPress={() => selectImage('image2')}
                  >
                    <Text style={styles.selectImageText}>Select Image</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Image 3 - Optional */}
              <View style={styles.imageUploadSection}>
                <Text style={styles.imageLabel}>Image 3 (Optional)</Text>
                {uploadImages.image3 ? (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: uploadImages.image3.uri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage('image3')}
                    >
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.selectImageButton}
                    onPress={() => selectImage('image3')}
                  >
                    <Text style={styles.selectImageText}>Select Image</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setUploadModalVisible(false)}
                  disabled={uploading}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={submitImages}
                  disabled={uploading || !uploadImages.image1}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#00796b',
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  info: {
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00796b',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 0.48,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullWidthButton: {
    flex: 1,
    marginTop: 8,
  },
  pickedButton: {
    backgroundColor: '#4caf50',
  },
  deliveryButton: {
    backgroundColor: '#ff9800',
  },
  uploadButton: {
    backgroundColor: '#2196f3',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusIndicator: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  statusText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },
  noDeliveries: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDeliveriesText: {
    fontSize: 18,
    color: '#00796b',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalContent: {
    maxHeight: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00796b',
    marginBottom: 20,
    textAlign: 'center',
  },
  imageUploadSection: {
    marginBottom: 20,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  selectImageButton: {
    backgroundColor: '#e0e0e0',
    padding: 40,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
  },
  selectImageText: {
    fontSize: 16,
    color: '#666',
  },
  selectedImageContainer: {
    alignItems: 'center',
  },
  selectedImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  removeImageButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  submitButton: {
    backgroundColor: '#4caf50',
  },
});