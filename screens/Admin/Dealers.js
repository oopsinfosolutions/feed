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

const Dealers = () => {
  const [tab, setTab] = useState('Dealer');
  const [fadeAnim] = useState(new Animated.Value(0));

  // Material Information - Updated for dealer shipments
  const [materialName, setMaterialName] = useState('');
  const [materialDetails, setMaterialDetails] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [commission, setCommission] = useState('');
  const [totalPrice, setTotalPrice] = useState('');


  // Dealer and Client Details
  const [dealer, setDealer] = useState('');
  const [client, setClient] = useState('');

  // Location Details
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');

  // Shipment List Management
  const [shipments, setShipments] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Status field
  const [status, setStatus] = useState('Confirmed');

  // Base URL for your API
  const API_BASE_URL = 'http://192.168.1.15:3000';

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

  const loadShipments = async () => {
    try {
      // Using the same endpoint as material.js - you may need to update this based on your backend
      const response = await axios.get(`${API_BASE_URL}/shipment`);
      setShipments(response.data || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
      Alert.alert('Error', 'Failed to load shipments');
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

  const handleAddOrUpdateShipment = async () => {
    // Validation for required fields
    if (!materialName || !quantity || !dealer || !client || !pricePerUnit || commission === '') {
      Alert.alert('Validation Error', 'Please fill all required fields: Material Name, Quantity, Dealer, Client, Price per Unit, and Commission.');
      return;
    }

    try {
      const formData = new FormData();

      // Add form fields matching your backend route
      formData.append('material_Name', materialName);
      formData.append('detail', materialDetails || '');
      formData.append('quantity', quantity);
      formData.append('dealer', dealer);
      formData.append('client', client);
      formData.append('price_per_unit', pricePerUnit);
      formData.append('commission', commission);
      
      // Optional fields
      formData.append('pickup_location', pickupLocation || '');
      formData.append('drop_location', dropLocation || '');
      formData.append('status', status);


      let response;
      if (editingId) {
        // Update existing shipment - you may need to create this endpoint
        response = await axios.put(`${API_BASE_URL}/update-dealer-shipment/${editingId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        Alert.alert('Success', 'Dealer shipment updated successfully!');
      } else {
        // Add new shipment using your provided route
        response = await axios.post(`${API_BASE_URL}/admin_dealer_shipment`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        Alert.alert('Success', 'Dealer shipment added successfully!');
      }

      // Reload shipments and reset form
      await loadShipments();
      resetForm();
      setTab('Dealers');
    } catch (error) {
      console.error('Error submitting dealer shipment:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit dealer shipment. Please try again.');
    }
  };

  const resetForm = () => {
    setMaterialName('');
    setMaterialDetails('');
    setQuantity('');
    setPricePerUnit('');
    setCommission('');
    setTotalPrice('');
    setImage1(null);
    setImage2(null);
    setImage3(null);
    setDealer('');
    setClient('');
    setPickupLocation('');
    setDropLocation('');
    setStatus('Confirmed');
    setEditIndex(null);
    setEditingId(null);
  };

  const handleRemoveShipment = (shipment) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this dealer shipment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // You may need to create this endpoint for dealer shipments
              await axios.delete(`${API_BASE_URL}/delete-dealer-shipment/${shipment.id}`);
              Alert.alert('Success', 'Dealer shipment deleted successfully');
              await loadShipments();
            } catch (error) {
              console.error('Error deleting dealer shipment:', error);
              Alert.alert('Error', 'Failed to delete dealer shipment');
            }
          },
        },
      ]
    );
  };

  const handleEditShipment = (shipment, index) => {
    setMaterialName(shipment.material_Name || '');
    setMaterialDetails(shipment.detail || '');
    setQuantity(shipment.quantity?.toString() || '');
    setPricePerUnit(shipment.price_per_unit?.toString() || '');
    setCommission(shipment.commission?.toString() || '');
    setTotalPrice(shipment.total_price?.toString() || '');
    setPickupLocation(shipment.pickup_location || '');
    setDropLocation(shipment.drop_location || '');
    setStatus(shipment.status || 'Confirmed');
    
    // Parse dealer and client from destination field if available
    if (shipment.destination) {
      const dealerMatch = shipment.destination.match(/Dealer: ([^,]+)/);
      const clientMatch = shipment.destination.match(/Client: ([^,]+)/);
      setDealer(dealerMatch ? dealerMatch[1].trim() : '');
      setClient(clientMatch ? clientMatch[1].trim() : '');
    }
    
    
    
    setEditIndex(index);
    setEditingId(shipment.id);
    setTab('Dealer');
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

  const renderDealerForm = () => (
    <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Material Information Section */}
        <Card style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>
              {editingId ? '✏️ Edit Dealer Shipment' : '🏪 Material Information'}
            </Title>
          </View>

          <Card.Content style={styles.cardContent}>
            <View style={styles.inputGroup}>
              <TextInput
                label="Material Name *"
                mode="outlined"
                style={styles.modernInput}
                outlineColor="#3B82F6"
                activeOutlineColor="#2563EB"
                left={<TextInput.Icon icon="cube-outline" color="#2563EB" />}
                value={materialName}
                onChangeText={setMaterialName}
                theme={{ colors: { primary: '#2563EB' } }}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                label="Material Details"
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.modernInput}
                outlineColor="#3B82F6"
                activeOutlineColor="#2563EB"
                left={<TextInput.Icon icon="information-outline" color="#2563EB" />}
                value={materialDetails}
                onChangeText={setMaterialDetails}
                theme={{ colors: { primary: '#2563EB' } }}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <TextInput
                  label="Quantity *"
                  mode="outlined"
                  style={styles.modernInput}
                  outlineColor="#3B82F6"
                  activeOutlineColor="#2563EB"
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="counter" color="#2563EB" />}
                  value={quantity}
                  onChangeText={setQuantity}
                  theme={{ colors: { primary: '#2563EB' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  label="Price per Unit *"
                  mode="outlined"
                  style={styles.modernInput}
                  outlineColor="#3B82F6"
                  activeOutlineColor="#2563EB"
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="currency-inr" color="#2563EB" />}
                  value={pricePerUnit}
                  onChangeText={setPricePerUnit}
                  theme={{ colors: { primary: '#2563EB' } }}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                label="Commission *"
                mode="outlined"
                style={styles.modernInput}
                outlineColor="#3B82F6"
                activeOutlineColor="#2563EB"
                keyboardType="numeric"
                left={<TextInput.Icon icon="percent" color="#2563EB" />}
                value={commission}
                onChangeText={setCommission}
                theme={{ colors: { primary: '#2563EB' } }}
              />
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

        
    
        {/* Dealer and Client Details Section */}
        <Card style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>🏪 Dealer & Client Details</Title>
          </View>

          <Card.Content style={styles.cardContent}>
            <View style={styles.inputGroup}>
              <TextInput
                label="Dealer *"
                mode="outlined"
                style={styles.modernInput}
                outlineColor="#3B82F6"
                activeOutlineColor="#2563EB"
                left={<TextInput.Icon icon="store-outline" color="#2563EB" />}
                value={dealer}
                onChangeText={setDealer}
                theme={{ colors: { primary: '#2563EB' } }}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                label="Client *"
                mode="outlined"
                style={styles.modernInput}
                outlineColor="#3B82F6"
                activeOutlineColor="#2563EB"
                left={<TextInput.Icon icon="account-tie-outline" color="#2563EB" />}
                value={client}
                onChangeText={setClient}
                theme={{ colors: { primary: '#2563EB' } }}
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
                outlineColor="#3B82F6"
                activeOutlineColor="#2563EB"
                left={<TextInput.Icon icon="map-marker-up" color="#2563EB" />}
                value={pickupLocation}
                onChangeText={setPickupLocation}
                theme={{ colors: { primary: '#2563EB' } }}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                label="Drop Location"
                mode="outlined"
                style={styles.modernInput}
                outlineColor="#3B82F6"
                activeOutlineColor="#2563EB"
                left={<TextInput.Icon icon="map-marker-down" color="#2563EB" />}
                value={dropLocation}
                onChangeText={setDropLocation}
                theme={{ colors: { primary: '#2563EB' } }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.modernButton} 
          onPress={handleAddOrUpdateShipment}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonText}>
              {editingId ? '✅ Update Dealer Shipment' : '➕ Add Dealer Shipment'}
            </Text>
          </View>
        </TouchableOpacity>

        {editingId && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              resetForm();
              setTab('Dealers');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel Edit</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Animated.View>
  );

  const renderDealersList = () => (
    <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      <Card style={styles.modernCard}>
        <View style={styles.cardHeader}>
          <Title style={styles.cardTitle}>🏪 Dealer Shipments List</Title>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadShipments}
            activeOpacity={0.7}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
        
        <Card.Content style={styles.cardContent}>
          {shipments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🏪</Text>
              <Text style={styles.emptyStateTitle}>No dealer shipments found</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add your first dealer shipment to get started
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {shipments.map((shipment, index) => (
                <Card key={shipment.id || index} style={styles.shipmentCard}>
                  <Card.Content style={styles.shipmentCardContent}>
                    <View style={styles.shipmentHeader}>
                      <Text style={styles.shipmentName}>{shipment.material_Name}</Text>
                      <View style={styles.shipmentActions}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditShipment(shipment, index)}
                        >
                          <Text style={styles.editButtonText}>✏️ Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleRemoveShipment(shipment)}
                        >
                          <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.shipmentDetails}>
                      <Text style={styles.shipmentDetailText}>
                        Qty: {shipment.quantity} @ ₹{shipment.price_per_unit} each
                      </Text>
                      <Text style={styles.shipmentTotalPrice}>
                        Total: ₹{shipment.total_price}
                      </Text>
                      <Text style={styles.shipmentCommission}>
                        Commission: {shipment.commission}%
                      </Text>
                      <Text style={styles.shipmentDetailText}>
                        Status: {shipment.status || 'Confirmed'}
                      </Text>
                    </View>

                    {shipment.destination && (
                      <View style={styles.shipmentDestination}>
                        <Text style={styles.destinationText}>
                          🎯 {shipment.destination}
                        </Text>
                      </View>
                    )}

                    {(shipment.pickup_location || shipment.drop_location) && (
                      <View style={styles.shipmentLocations}>
                        {shipment.pickup_location && (
                          <Text style={styles.locationText}>
                            📍 Pickup: {shipment.pickup_location}
                          </Text>
                        )}
                        {shipment.drop_location && (
                          <Text style={styles.locationText}>
                            📍 Drop: {shipment.drop_location}
                          </Text>
                        )}
                      </View>
                    )}

                    {shipment.image1 && (
                      <View style={styles.shipmentImageContainer}>
                        <Image 
                          source={{ uri: `${API_BASE_URL}/${shipment.image1}` }} 
                          style={styles.shipmentImage}
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
              tab === 'Dealer' && styles.activeModernTab
            ]}
            onPress={() => {
              setTab('Dealer');
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
              tab === 'Dealer' && styles.activeTabContent
            ]}>
              <Text style={[
                styles.tabText,
                tab === 'Dealer' && styles.activeTabText
              ]}>
                🏪 Dealer Shipment
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernTab,
              tab === 'Dealers' && styles.activeModernTab
            ]}
            onPress={() => {
              setTab('Dealers');
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
              tab === 'Dealers' && styles.activeTabContent
            ]}>
              <Text style={[
                styles.tabText,
                tab === 'Dealers' && styles.activeTabText
              ]}>
                📋 Dealers List
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {tab === 'Dealer' ? renderDealerForm() : renderDealersList()}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  backgroundContainer: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#93C5FD',
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
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '700',
  },
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  cardHeader: {
    backgroundColor: '#2563EB',
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
    backgroundColor: '#F0F9FF',
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
    backgroundColor: '#2563EB',
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
    color: '#1E40AF',
    marginBottom: 12,
  },
  imageUploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#93C5FD',
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
    backgroundColor: '#F0F9FF',
  },
  imagePlaceholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  imagePlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  imagePlaceholderSubtext: {
    fontSize: 14,
    color: '#1D4ED8',
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageCol: {
    flex: 0.48,
  },
  modernButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  refreshButton: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 12,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#1D4ED8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  shipmentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shipmentCardContent: {
    padding: 20,
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  shipmentName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 12,
  },
  shipmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  shipmentDetails: {
    marginBottom: 16,
  },
  shipmentDetailText: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 6,
    fontWeight: '500',
  },
  shipmentTotalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 6,
  },
  shipmentCommission: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 6,
  },
  shipmentDestination: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  destinationText: {
    fontSize: 15,
    color: '#1E40AF',
    fontWeight: '600',
  },
  shipmentLocations: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  locationText: {
    fontSize: 15,
    color: '#166534',
    fontWeight: '500',
    marginBottom: 4,
  },
  shipmentImageContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shipmentImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  required: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Dealers;