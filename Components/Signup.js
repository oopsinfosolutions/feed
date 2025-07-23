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
  const [fullname, setfullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('Select Role');
  const [menuVisible, setMenuVisible] = useState(false);
  const [users, setUsers] = useState([]);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleSignup = async () => {
    if (!fullname || !email || !password || !phone || type === 'Select Role') {
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
      fullname, 
      email, 
      password, 
      phone, 
      type
    };

    try {
      console.log('Sending User:', newUser);
      const response = await axios.post('http://192.168.1.42:3000/signup', newUser);

      console.log('Server Response:', response.data);
      
      // Handle different response scenarios
      if (response.data.message) {
        // Check if it's a pending approval message
        if (response.data.message.includes('approval')) {
          Alert.alert(
            'Registration Submitted', 
            'Your registration request has been sent to the admin for approval. You will be notified once approved.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Reset form
                  setfullname('');
                  setEmail('');
                  setPassword('');
                  setPhone('');
                  setType('Select Role');
                  
                  // Navigate to login screen
                  navigation.navigate('Login');
                }
              }
            ]
          );
        } else {
          // Regular successful registration
          setUsers([...users, { id: response.data.user?.id || Math.random(), ...newUser }]);
          
          // Reset form
          setfullname('');
          setEmail('');
          setPassword('');
          setPhone('');
          setType('Select Role');
          
          Alert.alert(
            'Success', 
            'User registered successfully! You can now login.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('Login')
              }
            ]
          );
        }
      }

    } catch (error) {
      console.error('Signup Error:', error);
      
      // Handle specific error messages from server
      if (error.response && error.response.data && error.response.data.error) {
        Alert.alert('Registration Error', error.response.data.error);
      } else if (error.response && error.response.status === 409) {
        Alert.alert('Error', 'Email or phone number already exists!');
      } else if (error.response && error.response.status === 400) {
        Alert.alert('Error', 'Please fill in all required fields correctly.');
      } else {
        Alert.alert('Error', 'Failed to register. Please try again.');
      }
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <Text style={styles.userName}>{item.fullname}</Text>
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
        value={fullname}
        onChangeText={setfullname}
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
        maxLength={10}
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
          onPress={() => { setType('client'); closeMenu(); }} 
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
          title="Employee" 
        />
        <Divider />
        <Menu.Item 
          onPress={() => { setType('office_employee'); closeMenu(); }} 
          title="Office Employee" 
        />
        <Divider />
        <Menu.Item 
          onPress={() => { setType('sale_parchase'); closeMenu(); }} 
          title="Sales & Purchase" 
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

      {/* Info text for employee types only */}
      {(type === 'employee' || type === 'officeemp' || type === 'sale_parchase') && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            ⚠️ Note: Employee registrations require admin approval before login access is granted.
          </Text>
        </View>
      )}

      {/* Info text for client/dealer */}
      {(type === 'client' || type === 'dealer') && (
        <View style={styles.successInfoContainer}>
          <Text style={styles.successInfoText}>
            ✅ Note: {type === 'client' ? 'Client' : 'Dealer'} accounts have immediate access after registration.
          </Text>
        </View>
      )}

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
  infoContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  infoText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  successInfoContainer: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  successInfoText: {
    color: '#155724',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
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