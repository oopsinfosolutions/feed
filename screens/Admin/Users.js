import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import axios from 'axios';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'approvals'
  const [approvalStats, setApprovalStats] = useState({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0
  });
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [form, setForm] = useState({
    fullname: '',
    email: '',
    phone: '',
    password: '',
    type: 'Client',
  });
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Updated user types to include Sales & Purchase
  const userTypes = ['Client', 'Field Employee', 'Office Employee', 'Dealer', 'Sales & Purchase'];

  // Generate unique user_id (same as Signup component)
  const generateUserId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `USER_${timestamp}_${random}`;
  };

  // Clear form
  const clearForm = () => {
    setForm({
      fullname: '',
      email: '',
      phone: '',
      password: '',
      type: 'Client',
    });
    setIsEditing(false);
    setEditingUserId(null);
  };

  // Fetch users from server
  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://192.168.29.161:3000/Users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    }
  };

  // Fetch pending approval requests
  const fetchPendingApprovals = async () => {
    try {
      const response = await axios.get('http://192.168.29.161:3000/api/admin/pending-approvals');
      if (response.data.success) {
        setPendingApprovals(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      Alert.alert('Error', 'Failed to fetch pending approvals');
    }
  };

  // Fetch approval statistics
  const fetchApprovalStats = async () => {
    try {
      const response = await axios.get('http://192.168.29.161:3000/api/admin/approval-stats');
      if (response.data.success) {
        setApprovalStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching approval stats:', error);
    }
  };

  // Load all data
  const loadAllData = async () => {
    await Promise.all([
      fetchUsers(),
      fetchPendingApprovals(),
      fetchApprovalStats()
    ]);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // Approve user
  const approveUser = async (userId) => {
    Alert.alert(
      'Approve User',
      'Are you sure you want to approve this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const response = await axios.post(`http://192.168.29.161:3000/api/admin/approve-user/${userId}`, {
                adminId: 1, // Using integer ID instead of string
                approvalNote: 'Approved by admin'
              });

              if (response.data.success) {
                Alert.alert('Success', 'User approved successfully!');
                await loadAllData();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to approve user');
              }
            } catch (error) {
              console.error('Error approving user:', error);
              Alert.alert('Error', 'Failed to approve user');
            }
          }
        }
      ]
    );
  };

  // Reject user - show reason input modal
  const showRejectUserModal = (userId) => {
    setSelectedUserId(userId);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  // Reject user with reason
  const rejectUser = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      const response = await axios.post(`http://192.168.29.161:3000/api/admin/reject-user/${selectedUserId}`, {
        adminId: 1, // Using integer ID instead of string
        rejectionReason: rejectionReason.trim()
      });

      if (response.data.success) {
        Alert.alert('Success', 'User rejected successfully!');
        setShowRejectionModal(false);
        setSelectedUserId(null);
        setRejectionReason('');
        await loadAllData();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      Alert.alert('Error', 'Failed to reject user');
    }
  };

  const addUser = async () => {
    const { fullname, email, phone, password, type } = form;

    if (!fullname || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address!');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid phone number!');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long!');
      return;
    }

    // Convert type to match backend expectations
    let backendType = type.toLowerCase().replace(' ', '_');
    if (type === 'Sales & Purchase') {
      backendType = 'sale_purchase';
    }

    const newUser = {
      fullname,
      email,
      phone,
      password,
      type: backendType,
      user_id: generateUserId(),
    };

    try {
      const response = await axios.post('http://192.168.29.161:3000/signup', newUser);
      console.log('User added:', response.data);

      clearForm();
      Alert.alert('Success', 'User added successfully!');
      await loadAllData();
    } catch (error) {
      console.error('Add User Error:', error);
      const msg =
        error.response?.data?.message ||
        (error.response?.status === 409
          ? 'Email or User ID already exists!'
          : 'Failed to add user. Please try again.');
      Alert.alert('Error', msg);
    }
  };

  const updateUser = async () => {
    const { fullname, email, phone, password, type } = form;

    if (!fullname || !email || !phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address!');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid phone number!');
      return;
    }

    if (password && password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long!');
      return;
    }

    // Convert type to match backend expectations
    let backendType = type.toLowerCase().replace(' ', '_');
    if (type === 'Sales & Purchase') {
      backendType = 'sale_purchase';
    }

    const updatedUser = {
      fullname,
      email,
      phone,
      type: backendType,
    };

    // Only include password if it's provided
    if (password) {
      updatedUser.password = password;
    }

    try {
      const response = await axios.put(`http://192.168.29.161:3000/users/${editingUserId}`, updatedUser);
      console.log('User updated:', response.data);

      clearForm();
      Alert.alert('Success', 'User updated successfully!');
      await loadAllData();
    } catch (error) {
      console.error('Update User Error:', error);
      const msg = error.response?.data?.message || 'Failed to update user. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  const editUser = (user) => {
    setForm({
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      password: '', // Don't prefill password for security
      type: formatUserType(user.type),
    });
    setIsEditing(true);
    setEditingUserId(user.user_id || user.id);
    setShowTypePicker(false);
  };

  const cancelEdit = () => {
    Alert.alert('Cancel Edit', 'Are you sure you want to cancel editing?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: () => clearForm(),
      },
    ]);
  };

  const deleteUser = async (userId) => {
    Alert.alert('Delete User', 'Are you sure you want to delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`http://192.168.29.161:3000/users/${userId}`);
            Alert.alert('Success', 'User deleted successfully!');
            await loadAllData();
            // Clear form if the deleted user was being edited
            if (editingUserId === userId) {
              clearForm();
            }
          } catch (error) {
            console.error('Delete Error:', error);
            Alert.alert('Error', 'Failed to delete user');
          }
        },
      },
    ]);
  };

  const selectUserType = (type) => {
    setForm({ ...form, type });
    setShowTypePicker(false);
  };

  const formatUserType = (type) => {
    if (type === 'sale_purchase') {
      return 'Sales & Purchase';
    }
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ffc107';
      case 'approved':
        return '#28a745';
      case 'rejected':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.fullname}</Text>
        <Text style={styles.userType}>{formatUserType(item.type)}</Text>
        <Text style={styles.userDetail}>{item.email}</Text>
        <Text style={styles.userDetail}>{item.phone}</Text>
        {item.user_id && (
          <Text style={styles.userId}>ID: {item.user_id}</Text>
        )}
        {item.status && (
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        )}
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => editUser(item)}
        >
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteUser(item.user_id || item.id)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPendingApproval = ({ item }) => (
    <View style={styles.approvalItem}>
      <View style={styles.approvalInfo}>
        <Text style={styles.approvalName}>{item.fullname}</Text>
        <Text style={styles.approvalType}>{formatUserType(item.type)}</Text>
        <Text style={styles.approvalDetail}>{item.email}</Text>
        <Text style={styles.approvalDetail}>{item.phone}</Text>
        <Text style={styles.approvalDate}>
          User ID: {item.user_id || item.id}
        </Text>
      </View>
      <View style={styles.approvalActions}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => approveUser(item.user_id || item.id)}
        >
          <Text style={styles.approveButtonText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => showRejectUserModal(item.user_id || item.id)}
        >
          <Text style={styles.rejectButtonText}>✗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              Users ({users.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'approvals' && styles.activeTab]}
            onPress={() => setActiveTab('approvals')}
          >
            <Text style={[styles.tabText, activeTab === 'approvals' && styles.activeTabText]}>
              Pending Approvals ({pendingApprovals.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Approval Stats */}
        {activeTab === 'approvals' && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{approvalStats.totalPending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{approvalStats.totalApproved}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{approvalStats.totalRejected}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>
        )}

        {activeTab === 'users' && (
          <>
            <Text style={styles.header}>
              {isEditing ? 'Edit User' : 'User Registration'}
            </Text>

            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={form.fullname}
                onChangeText={(text) => setForm({ ...form, fullname: text })}
                placeholderTextColor="#999"
                autoCapitalize="words"
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCompleteType="email"
                placeholderTextColor="#999"
              />

              <TextInput
                style={styles.input}
                placeholder="Phone"
                value={form.phone}
                onChangeText={(text) => setForm({ ...form, phone: text })}
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />

              <TextInput
                style={styles.input}
                placeholder={isEditing ? "Password (leave empty to keep current)" : "Password (min 6 characters)"}
                value={form.password}
                onChangeText={(text) => setForm({ ...form, password: text })}
                secureTextEntry
                autoCapitalize="none"
                placeholderTextColor="#999"
              />

              <View style={styles.dropdownContainer}>
                <Text style={styles.label}>Select Type:</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowTypePicker(!showTypePicker)}
                >
                  <Text style={styles.dropdownText}>{form.type}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {showTypePicker && (
                  <View style={styles.dropdownOptions}>
                    {userTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.dropdownOption,
                          form.type === type && styles.selectedOption,
                        ]}
                        onPress={() => selectUserType(type)}
                      >
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            form.type === type && styles.selectedOptionText,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.buttonContainer}>
                {isEditing ? (
                  <>
                    <TouchableOpacity style={styles.updateButton} onPress={updateUser}>
                      <Text style={styles.updateButtonText}>Update User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.addButton} onPress={addUser}>
                    <Text style={styles.addButtonText}>Add User</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.subHeader}>
                  Registered Users ({users.length} users)
                </Text>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {users.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No users registered yet</Text>
                </View>
              ) : (
                <FlatList
                  data={users}
                  keyExtractor={(item) => item.user_id || item.id?.toString() || Math.random().toString()}
                  renderItem={renderUser}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </>
        )}

        {activeTab === 'approvals' && (
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.subHeader}>
                Pending Approval Requests ({pendingApprovals.length} requests)
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {pendingApprovals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No pending approval requests</Text>
                <Text style={styles.emptyStateSubtext}>All employee requests have been processed</Text>
              </View>
            ) : (
              <FlatList
                data={pendingApprovals}
                keyExtractor={(item) => item.user_id || item.id?.toString() || Math.random().toString()}
                renderItem={renderPendingApproval}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Rejection Reason Modal */}
      <Modal
        visible={showRejectionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRejectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Reject User Request</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejection:</Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRejectionModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRejectButton}
                onPress={rejectUser}
              >
                <Text style={styles.modalRejectButtonText}>Reject User</Text>
              </TouchableOpacity>
            </View>
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
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
  },
  dropdownContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  dropdownOptions: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#007AFF',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    margin: 16,
    marginTop: 0,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  subHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  userItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  userDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userId: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#ffc107',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  editButtonText: {
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  approvalItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  approvalInfo: {
    flex: 1,
  },
  approvalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  approvalType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffc107',
    marginBottom: 8,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  approvalDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  approvalDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  approvalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#28a745',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButtonText: {
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
  modalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalRejectButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  modalRejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Users;