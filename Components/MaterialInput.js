import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button } from 'react-native-paper';

export default function MaterialForm({ onAdd }) {
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [destination, setDestination] = useState('');

  const handleSubmit = () => {
    const total = parseFloat(quantity) * parseFloat(price);
    onAdd({ name, detail, quantity, price, total, destination });
    setName(''); setDetail(''); setQuantity(''); setPrice(''); setDestination('');
  };

  return (
    <View style={styles.form}>
      <TextInput label="Name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput label="Detail" value={detail} onChangeText={setDetail} style={styles.input} />
      <TextInput label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" style={styles.input} />
      <TextInput label="Price per Unit" value={price} onChangeText={setPrice} keyboardType="numeric" style={styles.input} />
      <TextInput label="Destination" value={destination} onChangeText={setDestination} style={styles.input} />
      <Button mode="contained" onPress={handleSubmit}>Add Material</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { marginBottom: 20 },
  input: { marginBottom: 10 }
});
