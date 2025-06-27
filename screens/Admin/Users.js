import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  Animated,
  ScrollView,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Menu, Divider } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

const { width } = Dimensions.get('window');

// Completely isolated InputField component
const InputField = React.memo(({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  editable = true
}) => {
  return (
    <View style={[styles.inputContainer, !editable && styles.disabledInput]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={18} color="#64748b" />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        secureTextEntry={secureTextEntry}
        editable={editable}
        placeholderTextColor="#94a3b8"
        autoCorrect={false}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );
});

// Completely memoized UserCard component with better optimization
const UserCard = React.memo(({ item, index, onEdit, onDelete }) => {
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, index * 80);

    return () => clearTimeout(timer);
  }, [index, cardFadeAnim, cardSlideAnim]);

  const roleConfig = useMemo(() => {
    const getRoleColor = (roleType) => {
      switch (roleType?.toLowerCase()) {
        case 'client': return '#06d6a0';
        case 'dealer': return '#118ab2';
        case 'employee': return '#ffd60a';
        default: return '#8b5cf6';
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

    return {
      color: getRoleColor(item.type),
      icon: getRoleIcon(item.type)
    };
  }, [item.type]);

  const avatarText = useMemo(() => {
    return item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }, [item.name]);

  const handleEdit = useCallback(() => {
    onEdit(item);
  }, [item, onEdit]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete User',
      `Remove ${item.name} from your team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.email) },
      ]
    );
  }, [item.name, item.email, onDelete]);

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
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{avatarText}</Text>
        </View>

        <View style={styles.userDetails}>
          <View style={styles.nameSection}>
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleConfig.color }]}>
              <Ionicons name={roleConfig.icon} size={10} color="#fff" />
              <Text style={styles.roleBadgeText}>{item.type}</Text>
            </View>
          </View>

          <View style={styles.contactSection}>
            <View style={styles.contactRow}>
              <Ionicons name="mail" size={14} color="#64748b" />
              <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="call" size={14} color="#64748b" />
              <Text style={styles.contactText}>{item.phone}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={handleEdit}
          activeOpacity={0.7}
        >
          <Ionicons name="create" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return prevProps.item.email === nextProps.item.email &&
         prevProps.item.name === nextProps.item.name &&
         prevProps.item.phone === nextProps.item.phone &&
         prevProps.item.type === nextProps.item.type &&
         prevProps.index === nextProps.index;
});

// Form component to isolate form state
const UserForm = React.memo(({
  isVisible,
  isEditing,
  onSubmit,
  onCancel,
  loading,
  initialData
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'Select Role'
  });
  const [menuVisible, setMenuVisible] = useState(false);

  const formSlideAnim = useRef(new Animated.Value(-50)).current;

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        password: '',
        phone: initialData.phone || '',
        role: initialData.type || 'Select Role'
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'Select Role'
      });
    }
  }, [initialData]);

  useEffect(() => {
    Animated.spring(formSlideAnim, {
      toValue: isVisible ? 0 : -50,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [isVisible, formSlideAnim]);

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.name.trim()) {
      Alert.alert('Missing Information', 'Please enter a name.');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Missing Information', 'Please enter an email address.');
      return;
    }
    if (!formData.password.trim()) {
      Alert.alert('Missing Information', 'Please enter a password.');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Missing Information', 'Please enter a phone number.');
      return;
    }
    if (formData.role === 'Select Role') {
      Alert.alert('Missing Information', 'Please select a role.');
      return;
    }

    onSubmit(formData);
  }, [formData, onSubmit]);

  const selectRole = useCallback((selectedRole) => {
    updateField('role', selectedRole);
    setMenuVisible(false);
  }, [updateField]);

  const handleCancel = useCallback(() => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'Select Role'
    });
    onCancel();
  }, [onCancel]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.formContainer,
        {
          transform: [{ translateY: formSlideAnim }],
        },
      ]}
    >
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>
          {isEditing ? "Update Member" : "Add New Member"}
        </Text>
        <Text style={styles.formSubtitle}>
          {isEditing ? "Modify member information" : "Fill in the details below"}
        </Text>
      </View>

      <View style={styles.formFields}>
        <InputField
          icon="person"
          placeholder="Full name"
          value={formData.name}
          onChangeText={(text) => updateField('name', text)}
        />

        <InputField
          icon="mail"
          placeholder="Email address"
          value={formData.email}
          onChangeText={(text) => updateField('email', text)}
          keyboardType="email-address"
          editable={!isEditing}
        />

        <InputField
          icon="lock-closed"
          placeholder={isEditing ? "New password" : "Password"}
          value={formData.password}
          onChangeText={(text) => updateField('password', text)}
          secureTextEntry
        />

        <InputField
          icon="call"
          placeholder="Phone number"
          value={formData.phone}
          onChangeText={(text) => updateField('phone', text)}
          keyboardType="phone-pad"
        />

        <View style={styles.roleContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="briefcase" size={18} color="#64748b" />
          </View>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.roleSelector}
                onPress={() => setMenuVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.roleSelectorText,
                  formData.role === 'Select Role' && styles.placeholder
                ]}>
                  {formData.role}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>
            }
          >
            <Menu.Item onPress={() => selectRole('Client')} title="Client" />
            <Divider />
            <Menu.Item onPress={() => selectRole('Dealer')} title="Dealer" />
            <Divider />
            <Menu.Item onPress={() => selectRole('Employee')} title="Employee" />
          </Menu>
        </View>

        <View style={styles.formActions}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, marginRight: 8 }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  {loading ? "Updating..." : "Update"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1, marginLeft: 8 }]}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color="#64748b" />
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {loading ? "Adding..." : "Add Member"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

const Users = () => {
  const [users, setUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);

  // Use refs for animations to prevent re-creation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(searchInput.toLowerCase());
      const matchesRole = roleFilter ? user.type?.toLowerCase() === roleFilter.toLowerCase() : true;
      return matchesSearch && matchesRole;
    });
  }, [users, searchInput, roleFilter]);

  useEffect(() => {
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://192.168.1.15:3000/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFormSubmit = useCallback(async (formData) => {
    setLoading(true);
    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        phone: formData.phone.trim(),
        type: formData.role
      };
      if (isEditing) {
        await axios.put(`http://192.168.1.15:3000/update-user/${editingUser.email}`, {
          name: userData.name,
          password: userData.password,
          phone: userData.phone,
          type: userData.type
        });
        Alert.alert('Success', 'User updated successfully!');
      } else {
        await axios.post('http://192.168.1.15:3000/signup', userData);
        Alert.alert('Success', 'User added successfully!');
      }
      await fetchUsers();
      handleFormCancel();
    } catch (error) {
      console.error(isEditing ? 'Update User Error:' : 'Add User Error:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} user. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [isEditing, editingUser, fetchUsers]);

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
    setIsEditing(false);
    setEditingUser(null);
  }, []);

  const handleDeleteUser = useCallback(async (emailToDelete) => {
    setLoading(true);
    try {
      await axios.delete(`http://192.168.1.15:3000/delete-user/${emailToDelete}`);
      setUsers(prevUsers => prevUsers.filter(user => user.email !== emailToDelete));
      Alert.alert('Success', 'User deleted successfully!');
    } catch (error) {
      console.error('Delete User Error:', error);
      Alert.alert('Error', 'Failed to delete user. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEditUser = useCallback((user) => {
    setEditingUser(user);
    setIsEditing(true);
    setShowForm(true);
  }, []);

  const toggleForm = useCallback(() => {
    if (showForm) {
      handleFormCancel();
    } else {
      setShowForm(true);
    }
  }, [showForm, handleFormCancel]);

  const handleRoleFilter = useCallback((selectedRole) => {
    setRoleFilter(selectedRole);
    setMenuVisible(false);
  }, []);

  // Stable render functions
  const renderUser = useCallback(({ item, index }) => (
    <UserCard
      key={item.email}
      item={item}
      index={index}
      onEdit={handleEditUser}
      onDelete={handleDeleteUser}
    />
  ), [handleEditUser, handleDeleteUser]);

  const keyExtractor = useCallback((item) => item.email, []);

  const memoizedUsersList = useMemo(() => (
    <FlatList
      data={filteredUsers}
      keyExtractor={keyExtractor}
      renderItem={renderUser}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.usersList}
      scrollEnabled={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      getItemLayout={(data, index) => ({
        length: 200, // Approximate height of each item
        offset: 200 * index,
        index,
      })}
    />
  ), [filteredUsers, keyExtractor, renderUser]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.heading}>Team Management</Text>
            <Text style={styles.subHeading}>Manage your team members efficiently</Text>
          </View>

          <TouchableOpacity
            style={styles.toggleFormBtn}
            onPress={toggleForm}
            activeOpacity={0.8}
          >
            <Ionicons name={showForm ? "close" : "add"} size={20} color="#fff" />
            <Text style={styles.toggleFormBtnText}>
              {showForm ? "Close" : "Add Member"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <UserForm
            isVisible={showForm}
            isEditing={isEditing}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={loading}
            initialData={editingUser}
          />

          <Animated.View
            style={[
              styles.usersSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Team Members</Text>
              <View style={styles.memberCount}>
                <Text style={styles.memberCountText}>{users.length}</Text>
              </View>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}

            <View style={styles.filterContainer}>
              {/* Search Bar */}
              <TextInput
                placeholder="Search users..."
                value={searchInput}
                onChangeText={setSearchInput}
                style={styles.searchInput}
              />

              {/* Dropdown Filter */}
              <View style={styles.filterDropdown}>
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      style={styles.filterButton}
                      onPress={() => setMenuVisible(true)}
                    >
                      <Text style={styles.filterButtonText}>{roleFilter || "All Roles"}</Text>
                      <Ionicons name="chevron-down" size={16} color="#64748b" />
                    </TouchableOpacity>
                  }
                >
                  <Menu.Item onPress={() => handleRoleFilter('')} title="All Roles" />
                  <Divider />
                  <Menu.Item onPress={() => handleRoleFilter('client')} title="Client" />
                  <Divider />
                  <Menu.Item onPress={() => handleRoleFilter('dealer')} title="Dealer" />
                  <Divider />
                  <Menu.Item onPress={() => handleRoleFilter('employee')} title="Employee" />
                </Menu>
              </View>
            </View>

            {memoizedUsersList}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  subHeading: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '400',
  },
  toggleFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toggleFormBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  formHeader: {
    padding: 24,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  formFields: {
    padding: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    opacity: 0.6,
  },
  iconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  roleSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingRight: 16,
  },
  roleSelectorText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  placeholder: {
    color: '#94a3b8',
  },
  formActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  secondaryBtnText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  usersSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  memberCount: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberCountText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    borderColor: '#e2e8f0',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    flex: 1,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  filterDropdown: {
    flex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#e2e8f0',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  filterButtonText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  usersList: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  contactSection: {
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
  },
  editBtn: {
    backgroundColor: '#10b981',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default Users;