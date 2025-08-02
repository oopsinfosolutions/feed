import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
} from 'react-native';

// FIXED: Import API config correctly
import { API_CONFIG, API_ENDPOINTS } from '../../config/ApiConfig';

const CreateOrder = ({ userRole, userId, userInfo }) => {
  const [showForm, setShowForm] = useState(true);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Form data structure aligned with backend Material model
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    unit: '',
    quantity: '1',
    unitPrice: '',
    vehicleName: '',
    vehicleNumber: '',
    pincode: '',
    offer: '0',
    status: 'active',
    isTemplate: false,
    description: '',
    phone: '',
    c_id: '',
    detail: '',
  });

  // Updated state for send to client functionality (now send as bill)
  const [sendAsBill, setSendAsBill] = useState(false);
  
  // New states for bill-specific fields
  const [billFields, setBillFields] = useState({
    dueDate: '',
    additionalNotes: ''
  });

  useEffect(() => {
    fetchClients();
    if (!showForm) {
      fetchOrders();
    }
  }, [showForm]);

  useEffect(() => {
    calculateTotal();
  }, [formData.quantity, formData.unitPrice, formData.offer]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // FIXED: Use correct endpoint that exists
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Clients response:', data);
      
      if (data.success) {
        // Filter only clients from users
        const clientUsers = data.data?.filter(user => 
          user.type === 'Client' || user.type === 'client' || user.type === 'Customer'
        ) || [];
        setClients(clientUsers);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      
      if (error.name === 'AbortError') {
        Alert.alert('Error', 'Request timed out. Please check your server connection.');
      } else {
        Alert.alert('Error', `Failed to fetch clients: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      let url = `${API_CONFIG.BASE_URL}/api/orders/admin`;
      const params = new URLSearchParams();
      
      // Add filters based on selection
      if (selectedClientId) {
        params.append('clientId', selectedClientId);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userInfo?.token || 'dummy-token'}`,
        },
      });
      
      if (!response.ok) {
        // If /api/orders/admin doesn't exist, try alternative endpoints
        console.log(`Admin orders endpoint failed with ${response.status}, trying alternatives...`);
        
        // Try /api/materials/getdata as fallback
        const fallbackResponse = await fetch(`${API_CONFIG.BASE_URL}/api/materials/getdata`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.success) {
            setOrders(fallbackData.data || []);
            return;
          }
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Orders response:', data);
      
      if (data.success) {
        setOrders(data.data?.orders || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch orders');
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', `Failed to fetch orders: ${error.message}`);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const qty = parseFloat(formData.quantity) || 1;
    const price = parseFloat(formData.unitPrice) || 0;
    const offer = parseFloat(formData.offer) || 0;
    
    const subtotal = qty * price;
    const total = subtotal - (subtotal * (offer / 100));
    
    setFormData(prev => ({
      ...prev,
      totalPrice: total.toFixed(2)
    }));
    
    return total.toFixed(2);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBillFieldChange = (field, value) => {
    setBillFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getSelectedClientName = () => {
    const selectedClient = clients.find(client => client.id?.toString() === formData.c_id);
    return selectedClient ? `${selectedClient.fullname} (${selectedClient.email})` : 'Select Client';
  };

  const validateForm = () => {
    const requiredFields = ['name', 'quantity', 'unitPrice'];
    
    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        Alert.alert('Validation Error', `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    if (parseFloat(formData.quantity) <= 0) {
      Alert.alert('Validation Error', 'Quantity must be greater than 0');
      return false;
    }

    if (parseFloat(formData.unitPrice) <= 0) {
      Alert.alert('Validation Error', 'Unit price must be greater than 0');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // FIXED: Use correct endpoint for order submission
      const endpoint = sendAsBill ? '/api/orders/admin' : '/api/materials/submit';
      
      const submissionData = {
        ...formData,
        totalPrice: calculateTotal(),
        role: 'admin',
        type: sendAsBill ? 'bill' : 'order',
        createdBy: userId || 1,
        ...(sendAsBill && billFields)
      };

      console.log('Submitting to:', `${API_CONFIG.BASE_URL}${endpoint}`);
      console.log('Submission data:', submissionData);

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userInfo?.token || 'dummy-token'}`,
        },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        Alert.alert(
          'Success', 
          `${sendAsBill ? 'Bill' : 'Order'} created successfully!`,
          [{ text: 'OK', onPress: () => resetForm() }]
        );
        
        if (!showForm) {
          fetchOrders(); // Refresh orders list
        }
      } else {
        Alert.alert('Error', data.message || `Failed to create ${sendAsBill ? 'bill' : 'order'}`);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      Alert.alert('Error', `Failed to submit ${sendAsBill ? 'bill' : 'order'}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      unit: '',
      quantity: '1',
      unitPrice: '',
      vehicleName: '',
      vehicleNumber: '',
      pincode: '',
      offer: '0',
      status: 'active',
      isTemplate: false,
      description: '',
      phone: '',
      c_id: '',
      detail: '',
    });
    setBillFields({
      dueDate: '',
      additionalNotes: ''
    });
    setSendAsBill(false);
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setFormData({
      name: order.name || '',
      address: order.address || '',
      unit: order.unit || '',
      quantity: order.quantity?.toString() || '1',
      unitPrice: order.unitPrice?.toString() || '',
      vehicleName: order.vehicleName || '',
      vehicleNumber: order.vehicleNumber || '',
      pincode: order.pincode || '',
      offer: order.offer?.toString() || '0',
      status: order.status || 'active',
      isTemplate: order.isTemplate || false,
      description: order.description || '',
      phone: order.phone || '',
      c_id: order.c_id?.toString() || '',
      detail: order.detail || '',
    });
    setShowForm(true);
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderName}>{item.name}</Text>
        <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.orderDetail}>Quantity: {item.quantity}</Text>
      <Text style={styles.orderDetail}>Unit Price: ${item.unitPrice}</Text>
      <Text style={styles.orderDetail}>Total: ${item.totalPrice}</Text>
      <View style={styles.orderActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditOrder(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  const renderForm = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.formTitle}>
        {editingOrder ? 'Edit Order' : 'Create New Order'}
      </Text>

      {/* Client Selection */}
      <TouchableOpacity
        style={styles.clientSelector}
        onPress={() => setShowClientPicker(true)}
      >
        <Text style={styles.clientSelectorText}>{getSelectedClientName()}</Text>
      </TouchableOpacity>

      {/* Basic Order Fields */}
      <TextInput
        style={styles.input}
        placeholder="Product/Service Name *"
        value={formData.name}
        onChangeText={(value) => handleInputChange('name', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Description/Details"
        value={formData.detail}
        onChangeText={(value) => handleInputChange('detail', value)}
        multiline
        numberOfLines={3}
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Quantity *"
          value={formData.quantity}
          onChangeText={(value) => handleInputChange('quantity', value)}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Unit"
          value={formData.unit}
          onChangeText={(value) => handleInputChange('unit', value)}
        />
      </View>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Unit Price *"
          value={formData.unitPrice}
          onChangeText={(value) => handleInputChange('unitPrice', value)}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Offer %"
          value={formData.offer}
          onChangeText={(value) => handleInputChange('offer', value)}
          keyboardType="numeric"
        />
      </View>

      {/* Total Price Display */}
      <Text style={styles.totalPrice}>
        Total: ${formData.totalPrice || '0.00'}
      </Text>

      {/* Additional Fields */}
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={formData.address}
        onChangeText={(value) => handleInputChange('address', value)}
        multiline
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Phone"
          value={formData.phone}
          onChangeText={(value) => handleInputChange('phone', value)}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Pincode"
          value={formData.pincode}
          onChangeText={(value) => handleInputChange('pincode', value)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Vehicle Name"
          value={formData.vehicleName}
          onChangeText={(value) => handleInputChange('vehicleName', value)}
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Vehicle Number"
          value={formData.vehicleNumber}
          onChangeText={(value) => handleInputChange('vehicleNumber', value)}
        />
      </View>

      {/* Send as Bill Toggle */}
      <TouchableOpacity
        style={styles.toggleContainer}
        onPress={() => setSendAsBill(!sendAsBill)}
      >
        <Text style={styles.toggleLabel}>Send as Bill</Text>
        <View style={[styles.toggle, sendAsBill && styles.toggleActive]}>
          <View style={[styles.toggleDot, sendAsBill && styles.toggleDotActive]} />
        </View>
      </TouchableOpacity>

      {/* Bill-specific fields */}
      {sendAsBill && (
        <View style={styles.billFields}>
          <TextInput
            style={styles.input}
            placeholder="Due Date (YYYY-MM-DD)"
            value={billFields.dueDate}
            onChangeText={(value) => handleBillFieldChange('dueDate', value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Additional Notes"
            value={billFields.additionalNotes}
            onChangeText={(value) => handleBillFieldChange('additionalNotes', value)}
            multiline
            numberOfLines={2}
          />
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Creating...' : (editingOrder ? 'Update Order' : 'Create Order')}
        </Text>
      </TouchableOpacity>

      {editingOrder && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setEditingOrder(null);
            resetForm();
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel Edit</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderOrdersList = () => (
    <View style={styles.ordersContainer}>
      <View style={styles.ordersHeader}>
        <Text style={styles.ordersTitle}>Orders List</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowClientPicker(true)}
        >
          <Text style={styles.filterButtonText}>Filter by Client</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        refreshing={loading}
        onRefresh={fetchOrders}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No orders found</Text>
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, showForm && styles.activeTab]}
          onPress={() => setShowForm(true)}
        >
          <Text style={[styles.tabText, showForm && styles.activeTabText]}>
            Create Order
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, !showForm && styles.activeTab]}
          onPress={() => setShowForm(false)}
        >
          <Text style={[styles.tabText, !showForm && styles.activeTabText]}>
            View Orders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {showForm ? renderForm() : renderOrdersList()}

      {/* Client Picker Modal */}
      <Modal
        visible={showClientPicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Client</Text>
            <FlatList
              data={clients}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.clientItem}
                  onPress={() => {
                    handleInputChange('c_id', item.id?.toString() || '');
                    setSelectedClientId(item.id?.toString() || '');
                    setShowClientPicker(false);
                  }}
                >
                  <Text style={styles.clientName}>{item.fullname}</Text>
                  <Text style={styles.clientEmail}>{item.email}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No clients found</Text>
              }
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowClientPicker(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  formContainer: {
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  clientSelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  clientSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 15,
    paddingHorizontal: 5,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  billFields: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ordersContainer: {
    flex: 1,
    padding: 20,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  ordersTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  orderItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  editButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  clientItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clientEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeModalButton: {
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateOrder;