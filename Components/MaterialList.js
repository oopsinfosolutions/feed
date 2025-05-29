import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Modal, ScrollView
} from 'react-native';
import { Card, Button, Title } from 'react-native-paper';

export default function MaterialList({ materials, onEdit, onRemove }) {
  const [previewImage, setPreviewImage] = useState(null);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
      {materials.map((material, index) => (
        <Card key={index} style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>{material.name}</Title>
            <Text style={styles.text}>Details: {material.detail}</Text>
            <Text style={styles.text}>Quantity: {material.quantity}</Text>
            <Text style={styles.text}>Price: ₹{material.price}</Text>
            <Text style={styles.text}>Total: ₹{material.total}</Text>
            <Text style={styles.text}>Destination: {material.destination}</Text>

            {material.photo && (
              <TouchableOpacity onPress={() => setPreviewImage(material.photo)}>
                <Image source={{ uri: material.photo }} style={styles.image} />
              </TouchableOpacity>
            )}

            <View style={styles.actions}>
              <Button mode="outlined" onPress={() => onEdit(index)}>Edit</Button>
              <Button mode="contained" buttonColor="red" onPress={() => onRemove(index)}>Remove</Button>
            </View>
          </Card.Content>
        </Card>
      ))}

      {/* Fullscreen Image Modal */}
      <Modal visible={!!previewImage} transparent={true}>
        <TouchableOpacity style={styles.modalContainer} onPress={() => setPreviewImage(null)}>
          <Image source={{ uri: previewImage }} style={styles.fullImage} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 15,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff8c00',
    marginBottom: 5,
  },
  text: {
    fontSize: 14,
    marginBottom: 3,
    color: '#333',
  },
  image: {
    height: 180,
    borderRadius: 10,
    marginVertical: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
});
