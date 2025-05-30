import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
  Animated,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Menu, Divider, Button } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

const { width } = Dimensions.get('window');

// Separate UserCard component to properly use hooks
const UserCard = ({ item, index, onEdit, onDelete }) => {
  const [cardFadeAnim] = useState(new Animated.Value(0));
  const [cardSlideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.timing(cardFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [cardFadeAnim, cardSlideAnim, index]);

  const getRoleColor = (roleType) => {
    switch (roleType?.toLowerCase()) {
      case 'client': return '#10b981';
      case 'dealer': return '#3b82f6';
      case 'employee': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getRoleIcon = (roleType) => {
    switch (roleType?.toLowerCase()) {
      case 'client': return 'person-outline';
      case 'dealer': return 'business-outline';
      case 'employee': return 'people-outline';
      default: return 'help-outline';
    }
  };

  return (
    <Animated.View
      style={[
        styles.userCard,
        {
          opacity: cardFadeAnim,
          transform: [{ translateY: cardSlideAnim }],
        },
      ]}
    >
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.type) }]}>
              <Ionicons name={getRoleIcon(item.type)} size={12} color="#fff" />
              <Text style={styles.roleBadgeText}>{item.type}</Text>
            </View>
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={16} color="#6b7280" />
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color="#6b7280" />
              <Text style={styles.userPhone}>{item.phone}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onEdit(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() =>
            Alert.alert(
              'Confirm Delete',
              `Are you sure you want to delete user ${item.name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.email) },
              ]
            )
          }
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const Users = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Select Role');
  const [menuVisible, setMenuVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [formSlideAnim] = useState(new Animated.Value(-300));
  const [buttonScaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    fetchUsers();
  }, []);

  useEffect(() => {
    // Form animation
    Animated.timing(formSlideAnim, {
      toValue: showForm ? 0 : -300,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [showForm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://192.168.1.7:3000/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('Select Role');
    setIsEditing(false);
    setEditingEmail(null);
    setShowForm(false);
  };

  const handleAddUser = async () => {
    if (!name || !email || !password || !phone || role === 'Select Role') {
      Alert.alert('Validation Error', 'All fields and role selection are required!');
      return;
    }

    animateButton();
    setLoading(true);
    const newUser = { name, email, password, phone, type: role };

    try {
      await axios.post('http://192.168.1.7:3000/signup', newUser);
      fetchUsers();
      clearForm();
      Alert.alert('Success', 'User added successfully!');
    } catch (error) {
      console.error('Add User Error:', error);
      Alert.alert('Error', 'Failed to add user. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (emailToDelete) => {
    setLoading(true);
    try {
      await axios.delete(`http://192.168.1.7:3000/delete-user/${emailToDelete}`);
      setUsers(users.filter((user) => user.email !== emailToDelete));
      Alert.alert('Success', 'User deleted successfully!');
    } catch (error) {
      console.error('Delete User Error:', error);
      Alert.alert('Error', 'Failed to delete user. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone);
    setRole(user.type);
    setPassword('');
    setIsEditing(true);
    setEditingEmail(user.email);
    setShowForm(true);
  };

  const handleUpdateUser = async () => {
    if (!name || !password || !phone || role === 'Select Role') {
      Alert.alert('Validation Error', 'All fields except email are required for update!');
      return;
    }

    animateButton();
    setLoading(true);
    const updatedUser = { name, password, phone, type: role };

    try {
      await axios.put(`http://192.168.1.7:3000/update-user/${editingEmail}`, updatedUser);
      Alert.alert('Success', 'User updated successfully!');
      clearForm();
      fetchUsers();
    } catch (error) {
      console.error('Update User Error:', error);
      Alert.alert('Error', 'Failed to update user. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item, index }) => (
    <UserCard
      item={item}
      index={index}
      onEdit={handleEditUser}
      onDelete={handleDeleteUser}
    />
  );

  const InputField = ({ icon, placeholder, value, onChangeText, keyboardType, secureTextEntry, editable = true }) => (
    <View style={[styles.inputContainer, !editable && styles.disabledInput]}>
      <Ionicons name={icon} size={20} color="#6b7280" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        editable={editable}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.heading}>User Management</Text>
        <Text style={styles.subHeading}>Manage your team members</Text>
        
        <TouchableOpacity
          style={styles.addUserButton}
          onPress={() => setShowForm(!showForm)}
          activeOpacity={0.8}
        >
          <Ionicons name={showForm ? "close" : "add"} size={20} color="#fff" />
          <Text style={styles.addUserButtonText}>
            {showForm ? "Close Form" : "Add New User"}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.formContainer,
            {
              transform: [{ translateY: formSlideAnim }],
            },
          ]}
        >
          {showForm && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>
                {isEditing ? "Update User Information" : "Add New User"}
              </Text>

              <InputField
                icon="person-outline"
                placeholder="Enter full name"
                value={name}
                onChangeText={setName}
              />

              <InputField
                icon="mail-outline"
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                editable={!isEditing}
              />

              <InputField
                icon="lock-closed-outline"
                placeholder={isEditing ? "Enter new password" : "Enter password"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <InputField
                icon="call-outline"
                placeholder="Enter phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <View style={styles.roleContainer}>
                <Ionicons name="briefcase-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <Menu
                  visible={menuVisible}
                  onDismiss={closeMenu}
                  anchor={
                    <TouchableOpacity style={styles.roleSelector} onPress={openMenu}>
                      <Text style={[styles.roleSelectorText, role === 'Select Role' && styles.placeholder]}>
                        {role}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  }
                >
                  <Menu.Item onPress={() => { setRole('Client'); closeMenu(); }} title="Client" />
                  <Divider />
                  <Menu.Item onPress={() => { setRole('Dealer'); closeMenu(); }} title="Dealer" />
                  <Divider />
                  <Menu.Item onPress={() => { setRole('Employee'); closeMenu(); }} title="Employee" />
                </Menu>
              </View>

              <View style={styles.formActions}>
                {isEditing ? (
                  <>
                    <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                      <TouchableOpacity
                        style={[styles.primaryButton, { flex: 1, marginRight: 8 }]}
                        onPress={handleUpdateUser}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-outline" size={20} color="#fff" />
                        <Text style={styles.primaryButtonText}>
                          {loading ? "Updating..." : "Update User"}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>

                    <TouchableOpacity
                      style={[styles.secondaryButton, { flex: 1, marginLeft: 8 }]}
                      onPress={clearForm}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close-outline" size={20} color="#6b7280" />
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={handleAddUser}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="person-add-outline" size={20} color="#fff" />
                      <Text style={styles.primaryButtonText}>
                        {loading ? "Adding User..." : "Add User"}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.usersList,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.usersHeader}>
            <Text style={styles.usersTitle}>Team Members ({users.length})</Text>
            {loading && (
              <View style={styles.loadingIndicator}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
          </View>

          <FlatList
            data={users}
            keyExtractor={(item) => item.email}
            renderItem={renderUser}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            scrollEnabled={false}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addUserButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  container: {
    flex: 1,
  },
  formContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  form: {
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    opacity: 0.7,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  roleSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  roleSelectorText: {
    fontSize: 16,
    color: '#1f2937',
  },
  placeholder: {
    color: '#9ca3af',
  },
  formActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  usersList: {
    paddingHorizontal: 20,
  },
  usersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  usersTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  loadingIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  loadingText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  userHeader: {
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  contactInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  userPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  editButton: {
    backgroundColor: '#10b981',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default Users;