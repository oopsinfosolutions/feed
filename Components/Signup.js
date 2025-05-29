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
  const [name, setName] = useState('aniket');
  const [email, setEmail] = useState('aniket@gmail.com');
  const [password, setPassword] = useState('12345');
  const [phone, setPhone] = useState('1234567890');
  const [role, setRole] = useState('Select Role');
  const [menuVisible, setMenuVisible] = useState(false);
  const [users, setUsers] = useState([]);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !phone || role === 'Select Role') {
      Alert.alert('Validation Error', 'All fields and role selection are required!');
      return;
    }

    const newUser = { name, email, password, phone, type: role };

    try {
      console.log('Sending User:', newUser);
      const response = await axios.post('http://192.168.1.51:3000/signup', newUser);

      console.log('Server Response:', response.data);
      setUsers([...users, { id: response.data.id || Math.random(), ...newUser }]);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setRole('Select Role');
      Alert.alert('Success', 'User signed up successfully!');

      
    } catch (error) {
      console.error('Signup Error:', error);
      Alert.alert('Error', 'Failed to signup. Try again.');
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <Text style={styles.userName}>{item.name}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
      <Text style={styles.userPhone}>{item.phone}</Text>
      <Text style={styles.userPhone}>Role: {item.type}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Sign Up</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter your password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
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

      <Text style={styles.submittedUsersHeading}>Submitted Users:</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
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
});

export default Signup;
