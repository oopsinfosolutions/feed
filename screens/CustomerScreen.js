import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TextInput, Button, Title, Card, Text } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

const CustomerScreen = ({ route }) => {
  const [tab, setTab] = useState('Material');
  const [fadeAnim] = useState(new Animated.Value(0));

  // Get customer ID from route params (passed during login)
  const customerId = route?.params?.customerId || '';

  // Material Information - Updated to match backend fields
  const [materialName, setMaterialName] = useState('');
  const [materialDetails, setMaterialDetails] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [totalPrice, setTotalPrice] = useState('');

  // Images - Updated to match backend field names
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image3, setImage3] = useState(null);

  // Location Details - Updated to match backend
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');

  // Material List Management
  const [materials, setMaterials] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Status field
  const [status, setStatus] = useState('pending');
  const [user_id, setUser_id] = useState('');
  const [loading, setLoading] = useState(false);

  // Base URL for your API
  const API_BASE_URL = 'http://192.168.1.7:3000';

  // Get user ID from AsyncStorage on component mount
  useEffect(() => {
    const getUserId = async () => {
      try {
        console.log('Attempting to get user_id from AsyncStorage...');
        
        // Try multiple possible keys that might be used for user ID
        const possibleKeys = ['user_id', 'userId', 'id', 'customer_id', 'customerId'];
        let foundUserId = null;
        
        for (const key of possibleKeys) {
          const value = await AsyncStorage.getItem(key);
          console.log(`AsyncStorage key '${key}':`, value);
          if (value && value !== 'null' && value !== 'undefined') {
            foundUserId = value;
            console.log(`Found user ID with key '${key}':`, foundUserId);
            break;
          }
        }

        // Also check route params
        if (!foundUserId && customerId) {
          console.log('Using customerId from route params:', customerId);
          foundUserId = customerId;
        }

        // Also check all items in AsyncStorage for debugging
        console.log('All AsyncStorage keys:');
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('Available keys:', allKeys);
        
        if (foundUserId) {
          setUser_id(foundUserId);
          console.log('Set user_id to:', foundUserId);
        } else {
          console.log('No user ID found in any location');
          Alert.alert(
            'Error', 
            'User ID not found. Please login again.\n\nDebug info:\n' + 
            `Route customerId: ${customerId}\n` +
            `Available keys: ${allKeys.join(', ')}`
          );
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
        Alert.alert('Error', 'Failed to get user information. Please login again.\nError: ' + error.message);
      }
    };
    getUserId();
  }, [customerId]);

  // Debug useEffect to monitor user_id changes
  useEffect(() => {
    console.log('user_id state changed to:', user_id);
  }, [user_id]);

  // Animate tab changes
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [tab]);

  // Auto-calculate total price
  useEffect(() => {
    const q = parseFloat(quantity);
    const p = parseFloat(pricePerUnit);
    if (!isNaN(q) && !isNaN(p)) {
      setTotalPrice((q * p).toFixed(2));
    } else {
      setTotalPrice('');
    }
  }, [quantity, pricePerUnit]);

  // Load shipments when user_id is available
  useEffect(() => {
    if (user_id) {
      console.log('Loading shipments for user_id:', user_id);
      loadShipments(user_id);
    }
  }, [user_id]);

  const loadShipments = async (userId = user_id) => {
    if (!userId) {
      console.log('No user ID available for loading shipments');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading shipments for user:', userId);
      
      const response = await axios.get(`${API_BASE_URL}/shipment/user`, {
        params: { user_id: userId },
      });
      
      console.log('Shipments response:', response.data);
      setMaterials(response.data || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        Alert.alert('Error', `Failed to load shipments: ${error.response.data.message || error.response.data.error || 'Unknown error'}`);
      } else {
        Alert.alert('Error', 'Failed to load shipments. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectImage = (setImage) => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        console.error('Image Picker Error:', response.errorMessage);
        return;
      }
      const selected = response.assets?.[0];
      if (selected) {
        setImage(selected.uri);
      }
    });
  };

  const handleAddOrUpdateMaterial = async () => {
    console.log('=== DEBUG INFO ===');
    console.log('user_id state:', user_id);
    console.log('customerId from route:', customerId);
    console.log('materialName:', materialName);
    console.log('materialDetails:', materialDetails);
    console.log('quantity:', quantity);
    console.log('pricePerUnit:', pricePerUnit);
    console.log('=================');

    // Updated validation to match backend required fields
    if (!materialName || !materialDetails || !quantity || !pricePerUnit) {
      Alert.alert('Validation Error', 'Please fill all required fields: Material Name, Details, Quantity, and Price per Unit.');
      return;
    }

    // Check for user_id with more detailed error message
    if (!user_id || user_id === '' || user_id === 'null' || user_id === 'undefined') {
      console.error('User ID validation failed. Current user_id:', user_id);
      
      // Try to get fresh user_id from AsyncStorage
      try {
        const freshUserId = await AsyncStorage.getItem('user_id');
        console.log('Fresh user_id from AsyncStorage:', freshUserId);
        
        if (freshUserId && freshUserId !== 'null' && freshUserId !== 'undefined') {
          setUser_id(freshUserId);
          Alert.alert('Info', 'User ID recovered. Please try again.');
          return;
        }
      } catch (error) {
        console.error('Error getting fresh user_id:', error);
      }

      Alert.alert(
        'Authentication Error', 
        `User ID is required but not found.\n\n` +
        `Debug info:\n` +
        `- user_id state: "${user_id}"\n` +
        `- customerId from route: "${customerId}"\n` +
        `- Please login again to continue.`
      );
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();

      // Add form fields matching backend expectations
      formData.append('material_Name', materialName);
      formData.append('detail', materialDetails);
      formData.append('quantity', quantity);
      formData.append('price_per_unit', pricePerUnit);
      formData.append('pickup_location', pickupLocation || '');
      formData.append('drop_location', dropLocation || '');
      formData.append('c_id', user_id); // Use user_id instead of customerId
      formData.append('status', status);

      console.log('Sending c_id:', user_id);

      // Add images with correct field names
      if (image1) {
        const uriParts = image1.split('/');
        const fileName = uriParts[uriParts.length - 1];
        const fileType = fileName.split('.').pop();

        formData.append('image1', {
          uri: image1,
          name: fileName,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }

      if (image2) {
        const uriParts = image2.split('/');
        const fileName = uriParts[uriParts.length - 1];
        const fileType = fileName.split('.').pop();

        formData.append('image2', {
          uri: image2,
          name: fileName,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }

      if (image3) {
        const uriParts = image3.split('/');
        const fileName = uriParts[uriParts.length - 1];
        const fileType = fileName.split('.').pop();

        formData.append('image3', {
          uri: image3,
          name: fileName,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }

      let response;
      if (editingId) {
        // Update existing shipment
        response = await axios.put(`${API_BASE_URL}/update-shipment/${editingId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        Alert.alert('Success', 'Shipment updated successfully!');
      } else {
        // Add new shipment
        response = await axios.post(`${API_BASE_URL}/add_shipment`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        Alert.alert('Success', 'Shipment added successfully!');
      }

      // Reload shipments and reset form
      await loadShipments(user_id);
      resetForm();
      setTab('Materials');
    } catch (error) {
      console.error('Error submitting shipment:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        Alert.alert('Error', error.response?.data?.error || error.response?.data?.message || 'Failed to submit shipment. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to submit shipment. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMaterialName('');
    setMaterialDetails('');
    setQuantity('');
    setPricePerUnit('');
    setTotalPrice('');
    setImage1(null);
    setImage2(null);
    setImage3(null);
    setPickupLocation('');
    setDropLocation('');
    setStatus('pending');
    setEditIndex(null);
    setEditingId(null);
  };

  const handleRemoveMaterial = (shipment) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this shipment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await axios.delete(`${API_BASE_URL}/delete-shipment/${shipment.id}`);
              Alert.alert('Success', 'Shipment deleted successfully');
              await loadShipments(user_id);
            } catch (error) {
              console.error('Error deleting shipment:', error);
              Alert.alert('Error', 'Failed to delete shipment');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditMaterial = (shipment, index) => {
    setMaterialName(shipment.material_Name || '');
    setMaterialDetails(shipment.detail || '');
    setQuantity(shipment.quantity?.toString() || '');
    setPricePerUnit(shipment.price_per_unit?.toString() || '');
    setTotalPrice(shipment.total_price?.toString() || '');
    setPickupLocation(shipment.pickup_location || '');
    setDropLocation(shipment.drop_location || '');
    setStatus(shipment.status || 'pending');
    
    // Note: Images from backend might be file paths, handle accordingly
    setImage1(shipment.image1 ? `${API_BASE_URL}/${shipment.image1}` : null);
    setImage2(shipment.image2 ? `${API_BASE_URL}/${shipment.image2}` : null);
    setImage3(shipment.image3 ? `${API_BASE_URL}/${shipment.image3}` : null);
    
    setEditIndex(index);
    setEditingId(shipment.id);
    setTab('Material');
  };

  // Add a debug button to check AsyncStorage (remove in production)
  const debugAsyncStorage = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const allItems = await AsyncStorage.multiGet(allKeys);
      console.log('=== AsyncStorage Debug ===');
      allItems.forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
      console.log('========================');
      
      Alert.alert(
        'AsyncStorage Debug',
        allItems.map(([key, value]) => `${key}: ${value}`).join('\n')
      );
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  const ImageUploadCard = ({ title, image, onPress, required = false }) => (
    <View style={styles.imageUploadContainer}>
      <Text style={styles.imageUploadTitle}>
        {title} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity 
        style={styles.imageUploadButton} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        {image ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image }} style={styles.imagePreview} />
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>Tap to change</Text>
            </View>
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>📷</Text>
            <Text style={styles.imagePlaceholderText}>Upload Image</Text>
            <Text style={styles.imagePlaceholderSubtext}>Tap to select</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderMaterialForm = () => (
    <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Debug Info Card - Remove in production */}
        <Card style={[styles.modernCard, { backgroundColor: '#FEF3E2' }]}>
          <Card.Content>
            <Text style={{ fontSize: 12, color: '#92400E' }}>
              Debug: user_id = "{user_id}" | customerId = "{customerId}"
            </Text>
            <TouchableOpacity onPress={debugAsyncStorage} style={{ marginTop: 5 }}>
              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                Debug AsyncStorage
              </Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Material Information Section */}
        <Card style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>
              {editingId ? '✏️ Edit Shipment' : '📦 Material Information'}
            </Title>
          </View>

          <Card.Content style={styles.cardContent}>
            <View style={styles.inputGroup}>
              <TextInput
                label="Material Name *"
                mode="outlined"
                style={styles.modernInput}
                outlineColor="#FDBA74"
                activeOutlineColor="#FB923C"
                left={<TextInput.Icon icon="cube-outline" color="#FB923C" />}
                value={materialName}
                onChangeText={setMaterialName}
                theme={{ colors: { primary: '#FB923C' } }}
                disabled={loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                label="Material Details *"
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.modernInput}
                outlineColor="#FDBA74"
                activeOutlineColor="#FB923C"
                left={<TextInput.Icon icon="information-outline" color="#FB923C" />}
                value={materialDetails}
                onChangeText={setMaterialDetails}
                theme={{ colors: { primary: '#FB923C' } }}
                disabled={loading}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <TextInput
                  label="Quantity *"
                  mode="outlined"
                  style={styles.modernInput}
                  outlineColor="#FDBA74"
                  activeOutlineColor="#FB923C"
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="counter" color="#FB923C" />}
                  value={quantity}
                  onChangeText={setQuantity}
                  theme={{ colors: { primary: '#FB923C' } }}
                  disabled={loading}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  label="Price per Unit *"
                  mode="outlined"
                  style={styles.modernInput}
                  outlineColor="#FDBA74"
                  activeOutlineColor="#FB923C"
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="currency-inr" color="#FB923C" />}
                  value={pricePerUnit}
                  onChangeText={setPricePerUnit}
                  theme={{ colors: { primary: '#FB923C' } }}
                  disabled={loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.totalPriceContainer}>
                <View style={styles.totalPriceCard}>
                  <Text style={styles.totalPriceLabel}>Total Price</Text>
                  <Text style={styles.totalPriceValue}>₹{totalPrice || '0.00'}</Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Image Upload Section */}
        <Card style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>📸 Upload Images</Title>
          </View>

          <Card.Content style={styles.cardContent}>
            <ImageUploadCard
              title="Primary Image"
              image={image1}
              onPress={() => !loading && selectImage(setImage1)}
            />
            
            <View style={styles.imageRow}>
              <View style={styles.imageCol}>
                <ImageUploadCard
                  title="Additional 1"
                  image={image2}
                  onPress={() => !loading && selectImage(setImage2)}
                />
              </View>
              <View style={styles.imageCol}>
                <ImageUploadCard
                  title="Additional 2"
                  image={image3}
                  onPress={() => !loading && selectImage(setImage3)}
                />
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Location Details Section */}
        <Card style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>📍 Location Details</Title>
          </View>

          <Card.Content style={styles.cardContent}>
            <View style={styles.inputGroup}>
              <TextInput
                label="Pickup Location"
                mode="outlined"
                style={styles.modernInput}
                outlineColor="#FDBA74"
                activeOutlineColor="#FB923C"
                left={<TextInput.Icon icon="map-marker-up" color="#FB923C" />}
                value={pickupLocation}
                onChangeText={setPickupLocation}
                theme={{ colors: { primary: '#FB923C' } }}
                disabled={loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                label="Drop Location"
                mode="outlined"
                style={styles.modernInput}
                outlineColor="#FDBA74"
                activeOutlineColor="#FB923C"
                left={<TextInput.Icon icon="map-marker-down" color="#FB923C" />}
                value={dropLocation}
                onChangeText={setDropLocation}
                theme={{ colors: { primary: '#FB923C' } }}
                disabled={loading}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.modernButton, loading && styles.disabledButton]} 
          onPress={handleAddOrUpdateMaterial}
          activeOpacity={0.8}
          disabled={loading}
        >
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonText}>
              {loading ? '⏳ Processing...' : (editingId ? '✅ Update Shipment' : '➕ Add Shipment')}
            </Text>
          </View>
        </TouchableOpacity>

        {editingId && (
          <TouchableOpacity
            style={[styles.cancelButton, loading && styles.disabledButton]}
            onPress={() => {
              if (!loading) {
                resetForm();
                setTab('Materials');
              }
            }}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel Edit</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Animated.View>
  );

  const renderMaterialsList = () => (
    <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      <Card style={styles.modernCard}>
        <View style={styles.cardHeader}>
          <Title style={styles.cardTitle}>📋 My Shipments</Title>
          <TouchableOpacity
            style={[styles.refreshButton, loading && styles.disabledButton]}
            onPress={() => !loading && loadShipments(user_id)}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={styles.refreshButtonText}>
              {loading ? '⏳' : '🔄'} Refresh
            </Text>
          </TouchableOpacity>
        </View>
        
        <Card.Content style={styles.cardContent}>
          {!user_id ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>⚠️</Text>
              <Text style={styles.emptyStateTitle}>No User ID</Text>
              <Text style={styles.emptyStateSubtitle}>
                Please login to view your shipments
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>⏳</Text>
              <Text style={styles.emptyStateTitle}>Loading...</Text>
              <Text style={styles.emptyStateSubtitle}>
                Fetching your shipments
              </Text>
            </View>
          ) : materials.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📦</Text>
              <Text style={styles.emptyStateTitle}>No shipments found</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add your first shipment to get started
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {materials.map((material, index) => (
                <Card key={material.id || index} style={styles.materialCard}>
                  <Card.Content style={styles.materialCardContent}>
                    <View style={styles.materialHeader}>
                      <Text style={styles.materialName}>{material.material_Name}</Text>
                      <View style={styles.materialActions}>
                        <TouchableOpacity
                          style={[styles.editButton, loading && styles.disabledButton]}
                          onPress={() => !loading && handleEditMaterial(material, index)}
                          disabled={loading}
                        >
                          <Text style={styles.editButtonText}>✏️ Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.deleteButton, loading && styles.disabledButton]}
                          onPress={() => !loading && handleRemoveMaterial(material)}
                          disabled={loading}
                        >
                          <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.materialDetails}>
                      <Text style={styles.materialDetailText}>
                        Qty: {material.quantity} @ ₹{material.price_per_unit} each
                      </Text>
                      <Text style={styles.materialTotalPrice}>
                        Total: ₹{material.total_price}
                      </Text>
                      <Text style={styles.materialDetailText}>
                        Status: {material.status || 'pending'}
                      </Text>
                    </View>

                    {(material.pickup_location || material.drop_location) && (
                      <View style={styles.materialLocations}>
                        {material.pickup_location && (
                          <Text style={styles.locationText}>
                            📍 Pickup: {material.pickup_location}
                          </Text>
                        )}
                        {material.drop_location && (
                          <Text style={styles.locationText}>
                            📍 Drop: {material.drop_location}
                          </Text>
                        )}
                      </View>
                    )}

                    {material.image1 && (
                      <View style={styles.materialImageContainer}>
                        <Image 
                          source={{ uri: `${API_BASE_URL}/${material.image1}` }} 
                          style={styles.materialImage}
                        />
                      </View>
                    )}
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          )}
        </Card.Content>
      </Card>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundContainer}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.modernTab,
              tab === 'Material' && styles.activeModernTab
            ]}
            onPress={() => {
              if (!loading) {
                setTab('Material');
                fadeAnim.setValue(0);
                Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }).start();
              }
            }}
            activeOpacity={0.8}
            disabled={loading}
          >
            <View style={[
              styles.tabContent,
              tab === 'Material' && styles.activeTabContent
            ]}>
              <Text style={[
                styles.tabText,
                tab === 'Material' && styles.activeTabText
              ]}>
                📦 Shipment
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernTab,
              tab === 'Materials' && styles.activeModernTab
            ]}
            onPress={() => {
              if (!loading) {
                setTab('Materials');
                fadeAnim.setValue(0);
                Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }).start();
              }
            }}
            activeOpacity={0.8}
            disabled={loading}
          >
            <View style={[
              styles.tabContent,
              tab === 'Materials' && styles.activeTabContent
            ]}>
              <Text style={[
                styles.tabText,
                tab === 'Materials' && styles.activeTabText
              ]}>
                📋 My Shipments
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {tab === 'Material' ? renderMaterialForm() : renderMaterialsList()}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  backgroundContainer: {
    flex: 1,
    backgroundColor: '#FEF3E2',
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 4,
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  modernTab: {
    flex: 1,
    borderRadius: 21,
    overflow: 'hidden',
  },
  tabContent: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  activeTabContent: {
    backgroundColor: '#FB923C',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A16207',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '700',
  },
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  cardHeader: {
    backgroundColor: '#FB923C',
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  modernInput: {
    backgroundColor: 'white',
    fontSize: 16,
  },
  readOnlyInput: {
    backgroundColor: '#FEF3E2',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfInput: {
    flex: 1,
  },
  totalPriceContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 4,
  },
  totalPriceCard: {
    backgroundColor: '#EA580C',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  totalPriceLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
    marginBottom: 4,
  },
  totalPriceValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  imageUploadContainer: {
    marginBottom: 20,
  },
  imageUploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C2410C',
    marginBottom: 8,
  },
  required: {
    color: '#DC2626',
    fontWeight: '600',
  },
  imageUploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: '#FEF3E2',
    borderWidth: 2,
    borderColor: '#FDBA74',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#A16207',
    fontWeight: '500',
  },
  imagePlaceholderSubtext: {
    fontSize: 12,
    color: '#A16207',
    opacity: 0.7,
    marginTop: 4,
  },
  imageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageCol: {
    flex: 1,
  },
  modernButton: {
    backgroundColor: '#EA580C',
    marginHorizontal: 0,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#FB923C',
    marginBottom: 16,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A16207',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#A16207',
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  materialCard: {
    backgroundColor: '#FEF3E2',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  // Add these missing styles to your existing StyleSheet.create({}) object:

materialHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 12,
},

materialName: {
  flex: 1,
  fontSize: 18,
  fontWeight: '700',
  color: '#C2410C',
  marginRight: 12,
},

materialActions: {
  flexDirection: 'row',
  gap: 8,
},

editButton: {
  backgroundColor: '#3B82F6',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#60A5FA',
},

editButtonText: {
  color: 'white',
  fontSize: 12,
  fontWeight: '600',
},

deleteButton: {
  backgroundColor: '#DC2626',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#F87171',
},

deleteButtonText: {
  color: 'white',
  fontSize: 12,
  fontWeight: '600',
},

materialDetails: {
  marginBottom: 12,
  paddingVertical: 8,
  borderTopWidth: 1,
  borderTopColor: '#FDBA74',
},

materialDetailText: {
  fontSize: 14,
  color: '#A16207',
  marginBottom: 4,
  fontWeight: '500',
},

materialTotalPrice: {
  fontSize: 16,
  fontWeight: '700',
  color: '#EA580C',
  marginBottom: 4,
},

materialLocations: {
  marginBottom: 12,
  paddingVertical: 8,
  borderTopWidth: 1,
  borderTopColor: '#FDBA74',
},

locationText: {
  fontSize: 13,
  color: '#92400E',
  marginBottom: 4,
  fontWeight: '500',
},

materialImageContainer: {
  marginTop: 12,
  borderRadius: 8,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: '#FDBA74',
},

materialImage: {
  width: '100%',
  height: 120,
  borderRadius: 8,
},

activeModernTab: {
  // This style is handled by activeTabContent, but you can add specific tab styling here if needed
  shadowColor: '#FB923C',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
}
});

export default CustomerScreen;