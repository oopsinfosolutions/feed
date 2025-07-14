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

// Replace this with your actual server URL
const API_BASE_URL = 'http://192.168.1.42:3000';

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
      
      const response = await fetch(`${API_BASE_URL}/clients`, {
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
        setClients(data.clients || []);
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
      
      let url = `${API_BASE_URL}/api/admin/orders`;
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
          'Authorization': `Bearer ${userInfo?.token}`,
        },
      });
      
      if (!response.ok) {
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
    return selectedClient ? `${selectedClient.fullName} (${selectedClient.email})` : 'Select a client...';
  };

  const handleClientSelection = (clientId) => {
    const selectedClient = clients.find(client => client.id?.toString() === clientId);
    
    setFormData(prev => ({
      ...prev,
      c_id: clientId,
      phone: selectedClient?.phone || '',
    }));
    
    setShowClientPicker(false);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter material/product name');
      return false;
    }
    if (!formData.unit.trim()) {
      Alert.alert('Error', 'Please enter unit');
      return false;
    }
    if (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0) {
      Alert.alert('Error', 'Please enter valid unit price');
      return false;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      Alert.alert('Error', 'Please enter valid quantity');
      return false;
    }
    
    // Additional validation for send as bill
    if (sendAsBill && !formData.c_id) {
      Alert.alert('Error', 'Please select a client when sending order as bill');
      return false;
    }
    
    return true;
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
    setEditingOrder(null);
    setSendAsBill(false);
  };

  // New function to send order as bill
  const sendOrderAsBill = async (orderId) => {
    try {
      setLoading(true);
      
      const billData = {
        clientId: formData.c_id,
        dueDate: billFields.dueDate || null,
        additionalNotes: billFields.additionalNotes || '',
        createdBy: userInfo?.id || userId
      };

      console.log('Sending bill with data:', billData);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/send-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userInfo?.token}`,
        },
        body: JSON.stringify(billData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Bill send response:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Order created and bill sent to client successfully!');
        resetForm();
        if (!showForm) {
          fetchOrders();
        }
        return true;
      } else {
        Alert.alert('Error', data.message || 'Failed to send bill to client');
        return false;
      }
    } catch (error) {
      console.error('Error sending bill:', error);
      Alert.alert('Error', `Failed to send bill: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
  
    setLoading(true);
    try {
      let url, method;
      
      if (editingOrder) {
        // Editing existing order
        url = `${API_BASE_URL}/api/admin/orders/${editingOrder.id}`;
        method = 'PUT';
      } else {
        // Creating regular order (always create first, then send bill if needed)
        url = `${API_BASE_URL}/api/admin/orders`;
        method = 'POST';
      }
      
      // Create the data object to send
      const dataToSend = {
        name: formData.name,
        address: formData.address || '',
        unit: formData.unit,
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
        vehicleName: formData.vehicleName || '',
        vehicleNumber: formData.vehicleNumber || '',
        pincode: formData.pincode || '',
        offer: formData.offer,
        status: formData.status,
        isTemplate: formData.isTemplate,
        description: formData.description || '',
        phone: formData.phone || '',
        c_id: formData.c_id || '',
        detail: formData.detail || '',
      };

      // For updates, include customer fields that backend expects
      if (editingOrder) {
        const selectedClient = clients.find(client => client.id?.toString() === formData.c_id);
        if (selectedClient) {
          dataToSend.customerName = selectedClient.fullName;
          dataToSend.customerEmail = selectedClient.email;
          dataToSend.customerPhone = selectedClient.phone;
        }
      }
  
      console.log('Submitting order with data:', dataToSend);
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userInfo?.token}`,
        },
        body: JSON.stringify(dataToSend),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('Submit response:', data);
      
      if (data.success) {
        if (editingOrder) {
          Alert.alert('Success', 'Order updated successfully!');
          resetForm();
          if (!showForm) {
            fetchOrders();
          }
        } else {
          // Order created successfully
          const createdOrderId = data.data?.order?.id || data.data?.id;
          
          if (sendAsBill && createdOrderId) {
            // Send the order as bill
            const billSent = await sendOrderAsBill(createdOrderId);
            if (!billSent) {
              // Bill sending failed, but order was created
              Alert.alert('Partial Success', 'Order created successfully, but failed to send bill to client. You can try sending the bill later from the orders list.');
              resetForm();
              if (!showForm) {
                fetchOrders();
              }
            }
          } else {
            // Regular order creation
            Alert.alert('Success', 'Order created successfully!');
            resetForm();
            if (!showForm) {
              fetchOrders();
            }
          }
        }
      } else {
        Alert.alert('Error', data.message || `Failed to ${editingOrder ? 'update' : 'create'} order`);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      Alert.alert('Error', `Failed to ${editingOrder ? 'update' : 'create'} order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // New function to send existing order as bill
  const handleSendOrderAsBill = (order) => {
    Alert.prompt(
      'Send Bill to Client',
      'Enter due date (optional) in YYYY-MM-DD format:',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send Bill',
          onPress: async (dueDate) => {
            try {
              setLoading(true);
              
              const billData = {
                clientId: order.c_id,
                dueDate: dueDate || null,
                additionalNotes: '',
                createdBy: userInfo?.id || userId
              };

              const response = await fetch(`${API_BASE_URL}/api/admin/orders/${order.id}/send-bill`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${userInfo?.token}`,
                },
                body: JSON.stringify(billData),
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Bill sent to client successfully!');
                fetchOrders();
              } else {
                Alert.alert('Error', data.message || 'Failed to send bill');
              }
            } catch (error) {
              console.error('Error sending bill:', error);
              Alert.alert('Error', `Failed to send bill: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleEditOrder = (order) => {
    console.log('Editing order:', order);
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
      totalPrice: order.totalPrice?.toString() || '0',
    });
    setEditingOrder(order);
    setSendAsBill(false); // Reset send as bill when editing
    setShowForm(true);
  };

  const handleDeleteOrder = (orderId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteOrder(orderId)
        }
      ]
    );
  };

  const deleteOrder = async (orderId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userInfo?.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Order deleted successfully!');
        fetchOrders();
      } else {
        Alert.alert('Error', data.message || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      Alert.alert('Error', `Failed to delete order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderClientItem = ({ item }) => (
    <TouchableOpacity
      style={styles.clientItem}
      onPress={() => handleClientSelection(item.id?.toString())}
    >
      <Text style={styles.clientName}>{item.fullName}</Text>
      <Text style={styles.clientEmail}>{item.email}</Text>
      {item.phone && <Text style={styles.clientPhone}>{item.phone}</Text>}
    </TouchableOpacity>
  );

  const renderClientPickerModal = () => (
    <Modal
      visible={showClientPicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowClientPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Client</Text>
            <TouchableOpacity
              onPress={() => setShowClientPicker(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={clients}
            renderItem={renderClientItem}
            keyExtractor={(item) => item.id?.toString()}
            style={styles.clientList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );

  const renderOrderForm = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>
        {editingOrder ? 'Edit Order' : 'Create New Order'}
      </Text>
      
      {userRole === 'employee' && (
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>
            Employee: {userInfo?.name || 'Unknown'}
          </Text>
        </View>
      )}
      
      {editingOrder && (
        <TouchableOpacity
          style={styles.cancelEditButton}
          onPress={resetForm}
        >
          <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
        </TouchableOpacity>
      )}
      
      {/* Send as Bill Toggle - Only show when not editing */}
      {!editingOrder && (
        <View style={styles.sendAsBillContainer}>
          <TouchableOpacity
            style={[styles.sendAsBillToggle, sendAsBill && styles.sendAsBillToggleActive]}
            onPress={() => setSendAsBill(!sendAsBill)}
          >
            <Text style={[styles.sendAsBillText, sendAsBill && styles.sendAsBillTextActive]}>
              {sendAsBill ? '✓ Send as Bill to Client' : 'Send as Bill to Client'}
            </Text>
          </TouchableOpacity>
          {sendAsBill && (
            <Text style={styles.sendAsBillDescription}>
              Order will be created and automatically sent to the selected client as a bill
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Select Client {sendAsBill && <Text style={styles.requiredMark}>*</Text>}
        </Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading clients...</Text>
        ) : (
          <TouchableOpacity
            style={[styles.clientSelector, sendAsBill && !formData.c_id && styles.errorBorder]}
            onPress={() => setShowClientPicker(true)}
          >
            <Text style={[
              styles.clientSelectorText,
              !formData.c_id && styles.placeholderText
            ]}>
              {getSelectedClientName()}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Material/Product Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(value) => handleInputChange('name', value)}
          placeholder="Enter material/product name"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          placeholder="Enter description"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.rowContainer}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Quantity *</Text>
          <TextInput
            style={styles.input}
            value={formData.quantity}
            onChangeText={(value) => handleInputChange('quantity', value)}
            placeholder="Enter quantity"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Unit *</Text>
          <TextInput
            style={styles.input}
            value={formData.unit}
            onChangeText={(value) => handleInputChange('unit', value)}
            placeholder="kg, pcs, tons, etc."
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Unit Price *</Text>
        <TextInput
          style={styles.input}
          value={formData.unitPrice}
          onChangeText={(value) => handleInputChange('unitPrice', value)}
          placeholder="Enter price per unit"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Offer/Discount (%)</Text>
        <TextInput
          style={styles.input}
          value={formData.offer}
          onChangeText={(value) => handleInputChange('offer', value)}
          placeholder="Enter discount percentage"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Total Price</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={`₹${formData.totalPrice || '0'}`}
          editable={false}
          placeholderTextColor="#999"
        />
      </View>

      {/* Bill-specific fields - Only show when sending as bill */}
      {sendAsBill && (
        <>
          <View style={styles.billFieldsContainer}>
            <Text style={styles.billFieldsTitle}>Bill Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Due Date (Optional)</Text>
              <TextInput
                style={styles.input}
                value={billFields.dueDate}
                onChangeText={(value) => handleBillFieldChange('dueDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={billFields.additionalNotes}
                onChangeText={(value) => handleBillFieldChange('additionalNotes', value)}
                placeholder="Enter additional notes for the bill"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={formData.address}
          onChangeText={(value) => handleInputChange('address', value)}
          placeholder="Enter delivery address"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pincode</Text>
        <TextInput
          style={styles.input}
          value={formData.pincode}
          onChangeText={(value) => handleInputChange('pincode', value)}
          placeholder="Enter pincode"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Vehicle Name</Text>
        <TextInput
          style={styles.input}
          value={formData.vehicleName}
          onChangeText={(value) => handleInputChange('vehicleName', value)}
          placeholder="Enter vehicle name/type"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Vehicle Number</Text>
        <TextInput
          style={styles.input}
          value={formData.vehicleNumber}
          onChangeText={(value) => handleInputChange('vehicleNumber', value)}
          placeholder="Enter vehicle number"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Additional Details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.detail}
          onChangeText={(value) => handleInputChange('detail', value)}
          placeholder="Enter additional details"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Processing...' : 
           editingOrder ? 'Update Order' : 
           sendAsBill ? 'Create Order & Send Bill' : 'Create Order'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle}>{item.name}</Text>
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditOrder(item)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          {item.c_id && item.status !== 'bill_sent' && (
            <TouchableOpacity
              style={styles.billButton}
              onPress={() => handleSendOrderAsBill(item)}
            >
              <Text style={styles.billButtonText}>Send Bill</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteOrder(item.id)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <Text style={styles.orderDetailText}>
          <Text style={styles.boldText}>Order ID:</Text> {item.userId || item.id}
        </Text>
        {item.customerName && (
          <Text style={styles.orderDetailText}>
            <Text style={styles.boldText}>Customer:</Text> {item.customerName}
          </Text>
        )}
        {item.customerEmail && (
          <Text style={styles.orderDetailText}>
            <Text style={styles.boldText}>Email:</Text> {item.customerEmail}
          </Text>
        )}
        {item.customerPhone && (
          <Text style={styles.orderDetailText}>
            <Text style={styles.boldText}>Phone:</Text> {item.customerPhone}
          </Text>
        )}
        <Text style={styles.orderDetailText}>
          <Text style={styles.boldText}>Quantity:</Text> {item.quantity} {item.unit}
        </Text>
        <Text style={styles.orderDetailText}>
          <Text style={styles.boldText}>Unit Price:</Text> ₹{item.unitPrice}
        </Text>
        <Text style={styles.orderDetailText}>
          <Text style={styles.boldText}>Offer:</Text> {item.offer}%
        </Text>
        <Text style={styles.orderDetailText}>
          <Text style={styles.boldText}>Total:</Text> ₹{item.totalPrice}
        </Text>
        {item.address && (
          <Text style={styles.orderDetailText}>
            <Text style={styles.boldText}>Address:</Text> {item.address}
          </Text>
        )}
        {item.vehicleName && (
          <Text style={styles.orderDetailText}>
            <Text style={styles.boldText}>Vehicle:</Text> {item.vehicleName}
          </Text>
        )}
        {item.vehicleNumber && (
          <Text style={styles.orderDetailText}>
            <Text style={styles.boldText}>Vehicle No:</Text> {item.vehicleNumber}
          </Text>
        )}
        {item.description && (
          <Text style={styles.orderDetailText}>
            <Text style={styles.boldText}>Description:</Text> {item.description}
          </Text>
        )}
        {item.detail && (
          <Text style={styles.orderDetailText}>
            <Text style={styles.boldText}>Details:</Text> {item.detail}
          </Text>
        )}
        <Text style={styles.orderDetailText}>
          <Text style={styles.boldText}>Status:</Text> {item.status}
        </Text>
        {item.status === 'bill_sent' && (
          <Text style={styles.orderDetailText}>
            <Text style={styles.boldText}>Bill Status:</Text> Sent to Client
          </Text>
        )}
        {item.sentToClient && (
          <Text style={styles.orderDetailText}>
            <Text style={styles.boldText}>Sent to Client:</Text> {item.sentAt ? new Date(item.sentAt).toLocaleDateString() : 'Yes'}
          </Text>
        )}
        <Text style={styles.orderDetailText}>
          <Text style={styles.boldText}>Created:</Text> {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderOrdersList = () => (
    <View style={styles.ordersContainer}>
      <View style={styles.ordersHeader}>
        <Text style={styles.ordersTitle}>Orders</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchOrders}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !selectedClientId && styles.activeFilterButton]}
          onPress={() => {
            setSelectedClientId(null);
            fetchOrders();
          }}
        >
          <Text style={[styles.filterButtonText, !selectedClientId && styles.activeFilterButtonText]}>
            All Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.clientFilterButton}
          onPress={() => setShowClientPicker(true)}
        >
          <Text style={styles.clientFilterButtonText}>
            {selectedClientId ? 
              `Client: ${clients.find(c => c.id?.toString() === selectedClientId)?.fullName || 'Unknown'}` : 
              'Filter by Client'
            }
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <Text style={styles.loadingText}>Loading orders...</Text>
      ) : orders.length === 0 ? (
        <Text style={styles.noOrdersText}>No orders found</Text>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id?.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.ordersList}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, showForm && styles.activeTab]}
          onPress={() => setShowForm(true)}
        >
          <Text style={[styles.tabText, showForm && styles.activeTabText]}>
            {editingOrder ? 'Edit Order' : 'Create Order'}
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
      
      {showForm ? renderOrderForm() : renderOrdersList()}
      {renderClientPickerModal()}
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  userInfo: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  userInfoText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  cancelEditButton: {
    backgroundColor: '#ff6b6b',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  cancelEditButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  sendAsBillContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sendAsBillToggle: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  sendAsBillToggleActive: {
    backgroundColor: '#17a2b8',
  },
  sendAsBillText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendAsBillTextActive: {
    color: '#fff',
  },
  sendAsBillDescription: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  billFieldsContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bee5eb',
  },
  billFieldsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0c5460',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  requiredMark: {
    color: '#dc3545',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
  },
  errorBorder: {
    borderColor: '#dc3545',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.48,
  },
  clientSelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientSelectorText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  clientList: {
    maxHeight: 400,
  },
  clientItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 14,
    color: '#666',
  },
  ordersContainer: {
    flex: 1,
    padding: 20,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  ordersTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  filterButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilterButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  clientFilterButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
  },
  clientFilterButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  ordersList: {
    paddingBottom: 20,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#ffc107',
    padding: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  billButton: {
    backgroundColor: '#17a2b8',
    padding: 8,
    borderRadius: 6,
  },
  billButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  orderDetails: {
    gap: 5,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '600',
    color: '#333',
  },
  noOrdersText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default CreateOrder;