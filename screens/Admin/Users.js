import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { Menu, Divider, Button } from 'react-native-paper';
import axios from 'axios';

const Users = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Select Role');
  const [menuVisible, setMenuVisible] = useState(false);
  const [users, setUsers] = useState([]);

  // To track if editing mode is active
  const [isEditing, setIsEditing] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // According to your routes, GET '/' returns users
      const response = await axios.get('http://192.168.1.51:3000/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users.');
    }
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
  };

  const handleAddUser = async () => {
    if (!name || !email || !password || !phone || role === 'Select Role') {
      Alert.alert('Validation Error', 'All fields and role selection are required!');
      return;
    }

    const newUser = { name, email, password, phone, type: role };

    try {
      const response = await axios.post('http://192.168.1.51:3000/signup', newUser);
      // Refresh users list after add
      fetchUsers();
      clearForm();
      Alert.alert('Success', 'User added successfully!');
    } catch (error) {
      console.error('Add User Error:', error);
      Alert.alert('Error', 'Failed to add user. Try again.');
    }
  };

  const handleDeleteUser = async (emailToDelete) => {
    try {
      await axios.delete(`http://192.168.1.51:3000/delete-user/${emailToDelete}`);
      setUsers(users.filter((user) => user.email !== emailToDelete));
      Alert.alert('Success', 'User deleted successfully!');
    } catch (error) {
      console.error('Delete User Error:', error);
      Alert.alert('Error', 'Failed to delete user. Try again.');
    }
  };

  const handleEditUser = (user) => {
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone);
    setRole(user.type);
    // Do not fill password field for security, require re-entry if desired
    setPassword('');
    setIsEditing(true);
    setEditingEmail(user.email); // Track which user is being edited
  };

  const handleUpdateUser = async () => {
    if (!name || !password || !phone || role === 'Select Role') {
      Alert.alert('Validation Error', 'All fields except email are required for update!');
      return;
    }

    const updatedUser = { name, password, phone, type: role };

    try {
      await axios.put(`http://192.168.1.51:3000/update-user/${editingEmail}`, updatedUser);
      Alert.alert('Success', 'User updated successfully!');
      clearForm();
      fetchUsers();
    } catch (error) {
      console.error('Update User Error:', error);
      Alert.alert('Error', 'Failed to update user. Try again.');
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <Text style={styles.userName}>{item.name}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
      <Text style={styles.userPhone}>{item.phone}</Text>
      <Text style={styles.userRole}>Role: {item.type}</Text>

      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#007bff', marginRight: 10 }]}
          onPress={() => handleEditUser(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ff4d4d' }]}
          onPress={() =>
            Alert.alert(
              'Confirm Delete',
              `Are you sure you want to delete user ${item.name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteUser(item.email) },
              ]
            )
          }
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Admin Panel - {isEditing ? 'Update User' : 'Add Users'}</Text>

      <TextInput
        style={[styles.input, isEditing && { backgroundColor: '#eee' }]}
        placeholder="Enter name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={[styles.input, { backgroundColor: isEditing ? '#eee' : '#fff' }]}
        placeholder="Enter email"
        keyboardType="email-address"
        value={email}
        editable={!isEditing} // email is read-only in edit mode
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder={isEditing ? "Enter new password" : "Enter password"}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={
          <Button
            mode="outlined"
            onPress={openMenu}
            style={styles.menuButton}
          >
            {role}
          </Button>
        }
      >
        <Menu.Item onPress={() => { setRole('Client'); closeMenu(); }} title="Client" />
        <Divider />
        <Menu.Item onPress={() => { setRole('Dealer'); closeMenu(); }} title="Dealer" />
        <Divider />
        <Menu.Item onPress={() => { setRole('Employee'); closeMenu(); }} title="Employee" />
      </Menu>

      {isEditing ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity style={[styles.addButton, { flex: 1, marginRight: 10 }]} onPress={handleUpdateUser}>
            <Text style={styles.addButtonText}>Update User</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { flex: 1 }]}
            onPress={clearForm}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
          <Text style={styles.addButtonText}>Add User</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.submittedUsersHeading}>Users:</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.email}
        renderItem={renderUser}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  menuButton: {
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  addButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 15,
  },
  cancelButton: {
    backgroundColor: '#999',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 15,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  submittedUsersHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  userPhone: {
    fontSize: 16,
    color: '#666',
  },
  userRole: {
    fontSize: 16,
    color: '#666',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Users;
