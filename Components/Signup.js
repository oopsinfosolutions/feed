import React, { useState } from 'react';
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

const Signup = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('Select Role');
  const [menuVisible, setMenuVisible] = useState(false);
  const [users, setUsers] = useState([]);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // Generate unique user_id
  const generateUserId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `USER_${timestamp}_${random}`;
  };

  const handleSignup = async () => {
    if (!fullName || !email || !password || !phone || type === 'Select Role') {
      Alert.alert('Validation Error', 'All fields and role selection are required!');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address!');
      return;
    }

    // Phone validation (basic)
    if (phone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid phone number!');
      return;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long!');
      return;
    }

    const newUser = { 
      fullName, 
      email, 
      password, 
      phone, 
      type,
      user_id: generateUserId()
    };

    try {
      console.log('Sending User:', newUser);
      const response = await axios.post('http://192.168.1.15:3000/signup', newUser);

      console.log('Server Response:', response.data);
      setUsers([...users, { id: response.data.id || Math.random(), ...newUser }]);
      
      // Reset form
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setType('Select Role');
      
      Alert.alert('Success', 'User signed up successfully!');

    } catch (error) {
      console.error('Signup Error:', error);
      
      // Handle specific error messages from server
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert('Error', error.response.data.message);
      } else if (error.response && error.response.status === 409) {
        Alert.alert('Error', 'Email or User ID already exists!');
      } else {
        Alert.alert('Error', 'Failed to signup. Please try again.');
      }
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <Text style={styles.userName}>{item.fullName}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
      <Text style={styles.userPhone}>{item.phone}</Text>
      <Text style={styles.userRole}>Role: {item.type}</Text>
      <Text style={styles.userId}>ID: {item.user_id}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Sign Up</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your full name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCompleteType="email"
      />

      <TextInput
        style={styles.input}
        placeholder="Enter your password (min 6 characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Enter your phone number"
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
            {type}
          </Button>
        }
      >
        <Menu.Item 
          onPress={() => { setType('Client'); closeMenu(); }} 
          title="Client" 
        />
        <Divider />
        <Menu.Item 
          onPress={() => { setType('dealer'); closeMenu(); }} 
          title="Dealer" 
        />
        <Divider />
        <Menu.Item 
          onPress={() => { setType('field_employee'); closeMenu(); }} 
          title="Field Employee" 
        />
        <Divider />
        <Menu.Item 
          onPress={() => { setType('office_employee'); closeMenu(); }} 
          title="Office Employee" 
        />
      </Menu>

      <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
        <Text style={styles.signupButtonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginRedirectButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.loginRedirectText}>
          Already have an account? <Text style={{ fontWeight: 'bold' }}>Login</Text>
        </Text>
      </TouchableOpacity>

      {users.length > 0 && (
        <>
          <Text style={styles.submittedUsersHeading}>Submitted Users:</Text>
          <FlatList
            data={users}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderUser}
            style={styles.usersList}
          />
        </>
      )}
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
  signupButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 15,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginRedirectButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  loginRedirectText: {
    color: '#007bff',
    fontSize: 16,
  },
  submittedUsersHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  usersList: {
    maxHeight: 200,
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
  userId: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default Signup;