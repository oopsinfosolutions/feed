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

const Material = () => {
  const [tab, setTab] = useState('Material');
  const [fadeAnim] = useState(new Animated.Value(0));

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

  // Employee Details
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');

  // Customer Details
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');

  // Location Details - Updated to match backend
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');

  // Material List Management
  const [materials, setMaterials] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Status field
  const [status, setStatus] = useState('Confirmed');

  // Base URL for your API
  const API_BASE_URL = 'http://192.168.1.42:3000';

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

  // Load shipments on component mount
  useEffect(() => {
    loadShipments();
  }, []);

  // Auto-fetch employee details when employee ID changes
  useEffect(() => {
    if (employeeId.trim()) {
      fetchUserDetails(employeeId, 'employee');
    } else {
      setEmployeeName('');
      setEmployeeNumber('');
    }
  }, [employeeId]);

  // Auto-fetch customer details when customer ID changes
  useEffect(() => {
    if (customerId.trim()) {
      fetchUserDetails(customerId, 'customer');
    } else {
      setCustomerName('');
      setCustomerNumber('');
    }
  }, [customerId]);

  const loadShipments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/shipment`);
      setMaterials(response.data || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
      Alert.alert('Error', 'Failed to load shipments');
    }
  };

  const fetchUserDetails = async (userId, userType) => {
    try {
      // Updated to handle the corrected user_detail endpoint
      const response = await axios.get(`${API_BASE_URL}/user_id`, {
        params: {
          user_id: userId,
          employee_id: userId // Based on your backend logic, both params expect the same ID
        }
      });
      
      const userData = response.data;
      
      if (userType === 'employee') {
        setEmployeeName(userData.name || '');
        setEmployeeNumber(userData.phone || userData.mobile || '');
      } else if (userType === 'customer') {
        setCustomerName(userData.name || '');
        setCustomerNumber(userData.phone || userData.mobile || '');
      }
    } catch (error) {
      console.error(`Error fetching ${userType} details:`, error);
      if (userType === 'employee') {
        setEmployeeName('');
        setEmployeeNumber('');
      } else {
        setCustomerName('');
        setCustomerNumber('');
      }
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
    // Updated validation to remove destination requirement
    if (!materialName || !materialDetails || !quantity || !pricePerUnit) {
      Alert.alert('Validation Error', 'Please fill all required fields: Material Name, Details, Quantity, and Price per Unit.');
      return;
    }

    try {
      const formData = new FormData();

      // Add form fields matching backend expectations (removed destination)
      formData.append('material_Name', materialName);
      formData.append('detail', materialDetails);
      formData.append('quantity', quantity);
      formData.append('price_per_unit', pricePerUnit);
      formData.append('pickup_location', pickupLocation || '');
      formData.append('drop_location', dropLocation || '');
      formData.append('c_id', customerId || '');
      formData.append('e_id', employeeId || '');
      formData.append('status', status);

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
      await loadShipments();
      resetForm();
      setTab('Materials');
    } catch (error) {
      console.error('Error submitting shipment:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit shipment. Please try again.');
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
    setEmployeeId('');
    setEmployeeName('');
    setEmployeeNumber('');
    setCustomerId('');
    setCustomerName('');
    setCustomerNumber('');
    setPickupLocation('');
    setDropLocation('');
    setStatus('Confirmed');
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
              await axios.delete(`${API_BASE_URL}/delete-shipment/${shipment.id}`);
              Alert.alert('Success', 'Shipment deleted successfully');
              await loadShipments();
            } catch (error) {
              console.error('Error deleting shipment:', error);
              Alert.alert('Error', 'Failed to delete shipment');
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
    setEmployeeId(shipment.e_id || '');
    setCustomerId(shipment.c_id || '');
    setStatus(shipment.status || 'Confirmed');
    
    // Note: Images from backend might be file paths, handle accordingly
    setImage1(shipment.image1 ? `${API_BASE_URL}/${shipment.image1}` : null);
    setImage2(shipment.image2 ? `${API_BASE_URL}/${shipment.image2}` : null);
    setImage3(shipment.image3 ? `${API_BASE_URL}/${shipment.image3}` : null);
    
    setEditIndex(index);
    setEditingId(shipment.id);
    setTab('Material');
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
              onPress={() => selectImage(setImage1)}
            />
            
            <View style={styles.imageRow}>
              <View style={styles.imageCol}>
                <ImageUploadCard
                  title="Additional 1"
                  image={image2}
                  onPress={() => selectImage(setImage2)}
                />
              </View>
              <View style={styles.imageCol}>
                <ImageUploadCard
                  title="Additional 2"
                  image={image3}
                  onPress={() => selectImage(setImage3)}
                />
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Employee Details Section */}
        <Card style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>👤 Employee Details</Title>
          </View>

          <Card.Content style={styles.cardContent}>
            <View style={styles.inputGroup}>
              <TextInput
                label="Employee ID"
                mode="outlined"
                style={styles.modernInput}
                outlineColor="#FDBA74"
                activeOutlineColor="#FB923C"
                left={<TextInput.Icon icon="badge-account-outline" color="#FB923C" />}
                value={employeeId}
                onChangeText={setEmployeeId}
                theme={{ colors: { primary: '#FB923C' } }}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                label="Employee Name"
                mode="outlined"
                style={[styles.modernInput, styles.readOnlyInput]}
                outlineColor="#FDE68A"
                left={<TextInput.Icon icon="account-outline" color="#A16207" />}
                value={employeeName}
                editable={false}
                theme={{ colors: { primary: '#A16207' } }}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                label="Employee Number"
                mode="outlined"
                style={[styles.modernInput, styles.readOnlyInput]}
                outlineColor="#FDE68A"
                left={<TextInput.Icon icon="phone-outline" color="#A16207" />}
                value={employeeNumber}
                editable={false}
                theme={{ colors: { primary: '#A16207' } }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Customer Details Section */}
        <Card style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>🏢 Customer Details</Title>
          </View>

          <Card.Content style={styles.cardContent}>
            <View style={styles.inputGroup}>
              <TextInput
                label="Customer ID"
                mode="outlined"
                style={styles.modernInput}
                outlineColor="#FDBA74"
                activeOutlineColor="#FB923C"
                left={<TextInput.Icon icon="domain" color="#FB923C" />}
                value={customerId}
                onChangeText={setCustomerId}
                theme={{ colors: { primary: '#FB923C' } }}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                label="Customer Name"
                mode="outlined"
                style={[styles.modernInput, styles.readOnlyInput]}
                outlineColor="#FDE68A"
                left={<TextInput.Icon icon="account-tie-outline" color="#A16207" />}
                value={customerName}
                editable={false}
                theme={{ colors: { primary: '#A16207' } }}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                label="Customer Number"
                mode="outlined"
                style={[styles.modernInput, styles.readOnlyInput]}
                outlineColor="#FDE68A"
                left={<TextInput.Icon icon="phone-outline" color="#A16207" />}
                value={customerNumber}
                editable={false}
                theme={{ colors: { primary: '#A16207' } }}
              />
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
              />
            </View>
          </Card.Content>
        </Card>

        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.modernButton} 
          onPress={handleAddOrUpdateMaterial}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonText}>
              {editingId ? '✅ Update Shipment' : '➕ Add Shipment'}
            </Text>
          </View>
        </TouchableOpacity>

        {editingId && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              resetForm();
              setTab('Materials');
            }}
            activeOpacity={0.7}
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
          <Title style={styles.cardTitle}>📋 Shipments List</Title>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadShipments}
            activeOpacity={0.7}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
        
        <Card.Content style={styles.cardContent}>
          {materials.length === 0 ? (
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
                          style={styles.editButton}
                          onPress={() => handleEditMaterial(material, index)}
                        >
                          <Text style={styles.editButtonText}>✏️ Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleRemoveMaterial(material)}
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
                        Status: {material.status || 'Confirmed'}
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

                    {(material.e_id || material.c_id) && (
                      <View style={styles.materialEmployeeCustomer}>
                        {material.e_id && (
                          <Text style={styles.empCustText}>
                            👤 Employee: {material.e_id}
                          </Text>
                        )}
                        {material.c_id && (
                          <Text style={styles.empCustText}>
                            🏢 Customer: {material.c_id}
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
              setTab('Material');
              fadeAnim.setValue(0);
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }}
            activeOpacity={0.8}
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
              setTab('Materials');
              fadeAnim.setValue(0);
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }}
            activeOpacity={0.8}
          >
            <View style={[
              styles.tabContent,
              tab === 'Materials' && styles.activeTabContent
            ]}>
              <Text style={[
                styles.tabText,
                tab === 'Materials' && styles.activeTabText
              ]}>
                📋 Shipments List
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
  },
  cardTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
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
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfInput: {
    flex: 0.48,
  },
  totalPriceContainer: {
    alignItems: 'center',
  },
  totalPriceCard: {
    backgroundColor: '#FB923C',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  totalPriceLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalPriceValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  imageUploadContainer: {
    marginBottom: 20,
  },
  imageUploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A16207',
    marginBottom: 12,
  },
  imageUploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FDBA74',
    borderStyle: 'dashed',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    alignItems: 'center',
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF3E2',
  },
  imagePlaceholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  imagePlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A16207',
    marginBottom: 4,
  },
  imagePlaceholderSubtext: {
    fontSize: 14,
    color: '#92400E',
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageCol: {
    flex: 0.48,
  },
  modernButton: {
    backgroundColor: '#FB923C',
    borderRadius: 16,
    marginVertical: 12,
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContainer: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    marginVertical: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  refreshButtonText: {
    color: '#FB923C',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A16207',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#92400E',
    textAlign: 'center',
  },
  materialCard: {
    backgroundColor: '#FEF3E2',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  materialCardContent: {
    padding: 16,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  materialName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#A16207',
    flex: 1,
  },
  materialActions: {
    flexDirection: 'row',
  },
  editButton: {
    backgroundColor: '#FB923C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
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
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  materialDetails: {
    marginBottom: 12,
  },
  materialDetailText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 4,
  },
  materialTotalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FB923C',
    marginBottom: 4,
  },
  materialLocations: {
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 4,
  },
  materialEmployeeCustomer: {
    marginBottom: 12,
  },
  empCustText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 4,
  },
  materialImageContainer: {
    marginTop: 12,
  },
  materialImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  required: {
    color: '#DC2626',
  },
  activeModernTab: {
    backgroundColor: '#FB923C',
  },
});

export default Material;