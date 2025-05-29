import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';

export default function MaterialInput({ onAdd }) {
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [destination, setDestination] = useState('');
  const [photo, setPhoto] = useState(null);

  const handleChoosePhoto = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        console.log('Image Picker Error:', response.errorMessage);
        return;
      }

      const selected = response.assets?.[0];
      if (selected) {
        setPhoto(selected.uri);
      }
    });
  };

  const handleSubmit = () => {
    const total = parseFloat(quantity) * parseFloat(price);
    onAdd({ name, detail, quantity, price, total, destination, photo });
    setName('');
    setDetail('');
    setQuantity('');
    setPrice('');
    setDestination('');
    setPhoto(null);
  };

  return (
    <View style={styles.form}>
      <TextInput label="Name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput label="Detail" value={detail} onChangeText={setDetail} style={styles.input} />
      <TextInput label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" style={styles.input} />
      <TextInput label="Price per Unit" value={price} onChangeText={setPrice} keyboardType="numeric" style={styles.input} />
      <TextInput label="Destination" value={destination} onChangeText={setDestination} style={styles.input} />

      {photo && <Image source={{ uri: photo }} style={styles.image} />}
      <Button mode="outlined" onPress={handleChoosePhoto} style={styles.input}>
        {photo ? 'Change Photo' : 'Upload Photo'}
      </Button>

      <Button mode="contained" onPress={handleSubmit}>Add Material</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { marginBottom: 20, padding: 10 },
  input: { marginBottom: 10 },
  image: {
    width: '100%',
    height: 200,
    marginBottom: 10,
    borderRadius: 8,
  },
});
