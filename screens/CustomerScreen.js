import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { TextInput, Button, Title, Card } from 'react-native-paper';
import MaterialList from '../Components/MaterialList';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

export default function CustomerScreen() {
  const [tab, setTab] = useState('Shipment');

  // Form fields
  const [materialName, setMaterialName] = useState('');
  const [details, setDetails] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [destination, setDestination] = useState('');
  const [photo, setPhoto] = useState(null);

  const [materials, setMaterials] = useState([]);

  // Track index of item being edited, null if adding new
  const [editIndex, setEditIndex] = useState(null);

  // Auto-calculate total price
  useEffect(() => {
    const q = parseFloat(quantity);
    const p = parseFloat(price);
    if (!isNaN(q) && !isNaN(p)) {
      setTotalPrice((q * p).toFixed(2));
    } else {
      setTotalPrice('');
    }
  }, [quantity, price]);

  const handleChoosePhoto = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        console.error('Image Picker Error:', response.errorMessage);
        return;
      }
      const selected = response.assets?.[0];
      if (selected) {
        setPhoto(selected.uri);
      }
    });
  };

  // Add or update material on form submit, with axios POST to backend
  const handleAddOrUpdateMaterial = async () => {
    if (materialName && details && quantity && price && destination) {
      try {
        const formData = new FormData();

        formData.append('material_Name', materialName);
        formData.append('detail', details);
        formData.append('quantity', quantity);
        formData.append('price_per_unit', price);
        formData.append('destination', destination);

        if (photo) {
          const uriParts = photo.split('/');
          const fileName = uriParts[uriParts.length - 1];
          const fileType = fileName.split('.').pop();

          formData.append('image', {
            uri: photo,
            name: fileName,
            type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
          });
        }

        const response = await axios.post('http://192.168.1.43:3000/add_shipment', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        alert(response.data.message || 'Shipment added successfully!');

        // Update local materials state
        const newMaterial = {
          name: materialName,
          detail: details,
          quantity,
          price,
          total: totalPrice,
          destination,
          photo,
        };

        if (editIndex !== null) {
          const updatedMaterials = [...materials];
          updatedMaterials[editIndex] = newMaterial;
          setMaterials(updatedMaterials);
        } else {
          setMaterials([...materials, newMaterial]);
        }

        resetForm();
        setTab('Materials');
      } catch (error) {
        console.error('Error uploading shipment:', error);
        alert('Failed to add shipment. Please try again.');
      }
    } else {
      alert('Please fill all fields.');
    }
  };

  // Reset form fields and edit mode
  const resetForm = () => {
    setMaterialName('');
    setDetails('');
    setQuantity('');
    setPrice('');
    setTotalPrice('');
    setDestination('');
    setPhoto(null);
    setEditIndex(null);
  };

  // Remove material by index
  const handleRemoveMaterial = (index) => {
    const filtered = materials.filter((_, i) => i !== index);
    setMaterials(filtered);
  };

  // Edit material by index: load data into form, switch tab
  const handleEditMaterial = (index) => {
    const material = materials[index];
    setMaterialName(material.name);
    setDetails(material.detail);
    setQuantity(material.quantity);
    setPrice(material.price);
    setTotalPrice(material.total);
    setDestination(material.destination);
    setPhoto(material.photo);
    setEditIndex(index);
    setTab('Shipment');
  };

  // Shipment Details form UI
  const renderShipmentDetails = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>{editIndex !== null ? 'Edit Shipment' : 'Shipment Details'}</Title>

          <TextInput
            label="Material Name"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="cube-outline" />}
            value={materialName}
            onChangeText={setMaterialName}
          />
          <TextInput
            label="Details"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="information-outline" />}
            value={details}
            onChangeText={setDetails}
          />
          <TextInput
            label="Quantity"
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            left={<TextInput.Icon icon="counter" />}
            value={quantity}
            onChangeText={setQuantity}
          />
          <TextInput
            label="Price per Unit"
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            left={<TextInput.Icon icon="currency-inr" />}
            value={price}
            onChangeText={setPrice}
          />
          <TextInput
            label="Total Price"
            mode="outlined"
            style={styles.input}
            editable={false}
            left={<TextInput.Icon icon="calculator" />}
            value={totalPrice}
          />
          <TextInput
            label="Destination"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="map-marker-outline" />}
            value={destination}
            onChangeText={setDestination}
          />

          {photo && <Image source={{ uri: photo }} style={styles.imagePreview} />}
          <Button mode="outlined" onPress={handleChoosePhoto} style={styles.input}>
            {photo ? 'Change Photo' : 'Upload Photo'}
          </Button>

          <Button mode="contained" style={styles.button} onPress={handleAddOrUpdateMaterial}>
            {editIndex !== null ? 'Update Shipment' : 'Add Shipment'}
          </Button>

          {editIndex !== null && (
            <Button
              mode="text"
              onPress={() => {
                resetForm();
                setTab('Materials');
              }}
              style={{ marginTop: 10 }}
            >
              Cancel Edit
            </Button>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  // Materials List UI
  const renderMaterialsDetails = () => (
    <View style={{ flex: 1 }}>
      <Title style={styles.title}>Materials List</Title>
      {materials.length === 0 ? (
        <Title style={{ textAlign: 'center', marginTop: 20, color: '#777' }}>
          No materials added yet.
        </Title>
      ) : (
        <MaterialList materials={materials} onEdit={handleEditMaterial} onRemove={handleRemoveMaterial} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <Button
          mode={tab === 'Shipment' ? 'contained' : 'outlined'}
          onPress={() => setTab('Shipment')}
          style={[styles.tabButton, tab === 'Shipment' && styles.activeTab]}
          labelStyle={tab === 'Shipment' ? styles.activeTabLabel : styles.inactiveTabLabel}
        >
          Shipment Details
        </Button>
        <Button
          mode={tab === 'Materials' ? 'contained' : 'outlined'}
          onPress={() => setTab('Materials')}
          style={[styles.tabButton, tab === 'Materials' && styles.activeTab]}
          labelStyle={tab === 'Materials' ? styles.activeTabLabel : styles.inactiveTabLabel}
        >
          Materials Details
        </Button>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {tab === 'Shipment' ? renderShipmentDetails() : renderMaterialsDetails()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf6f0',
    padding: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 30,
  },
  activeTab: {
    backgroundColor: '#ff8c00',
  },
  activeTabLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  inactiveTabLabel: {
    color: '#ff8c00',
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 15,
    color: '#ff8c00',
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  button: {
    marginTop: 10,
    borderRadius: 25,
    backgroundColor: '#ff8c00',
    paddingVertical: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    marginBottom: 15,
    borderRadius: 12,
  },
});
