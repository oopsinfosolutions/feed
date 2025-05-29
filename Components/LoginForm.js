import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { TextInput, Button, Title } from 'react-native-paper';
import axios from 'axios';

const LoginForm = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }
  
    setLoading(true);
  
    try {
      const response = await axios.post('http://192.168.1.43:3000/login', { email, password });
  
      if (response.data.error) {
        Alert.alert('Login Failed', response.data.error);
      } else {
        const { type } = response.data;
  
        // Defer navigation to avoid render-time state updates
        setTimeout(() => {
          switch (type) {
            case 'Dealer':
              navigation.navigate('DealerScreen');
              break;
            case 'Client':
              navigation.navigate('CustomerScreen');
              break;
            case 'Employee':
              navigation.navigate('EmployeeScreen');
              break;
            case 'admin':
              navigation.navigate('AdminScreen');
              break;
            default:
              Alert.alert('Error', 'Unknown user role');
          }
        }, 0);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <Title style={styles.title}>Login</Title>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        style={styles.input}
        activeOutlineColor="#6200ee"
        left={<TextInput.Icon name="email-outline" />}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
        activeOutlineColor="#6200ee"
        left={<TextInput.Icon name="lock-outline" />}
      />

      <Button
        mode="contained"
        onPress={handleLogin}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
        loading={loading}
        disabled={loading}
      >
        {loading ? 'Logging in...' : 'Login'}
      </Button>

      <Button
        onPress={() => navigation.navigate('Signup')}
        style={styles.link}
        labelStyle={styles.linkLabel}
      >
        Don't have an account? Sign Up
      </Button>
    </SafeAreaView>
  );
};

export default LoginForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ff',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    alignSelf: 'center',
    marginBottom: 30,
    fontSize: 28,
    fontWeight: '700',
    color: '#6200ee',
  },
  input: {
    marginBottom: 18,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  button: {
    marginTop: 12,
    borderRadius: 30,
    backgroundColor: '#6200ee',
    elevation: 4,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  link: {
    marginTop: 22,
    alignSelf: 'center',
  },
  linkLabel: {
    color: '#6200ee',
    fontWeight: '600',
  },
});
