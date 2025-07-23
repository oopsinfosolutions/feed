import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Product = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    details: '',
    quantityInStore: '',
    unit: '',
    pricePerUnit: '',
    image1: null,
    image2: null,
  });

  // Your backend URL
  const BASE_URL = 'http://192.168.1.42:3000';

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch all products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/admin/products`);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Network error while fetching products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Handle text input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle image selection
  const selectImage = (imageField) => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0];
        setFormData(prev => ({
          ...prev,
          [imageField]: {
            uri: imageUri.uri,
            type: imageUri.type,
            name: imageUri.fileName || `image_${Date.now()}.jpg`,
          },
        }));
      }
    });
  };

  // Remove selected image
  const removeImage = (imageField) => {
    setFormData(prev => ({
      ...prev,
      [imageField]: null,
    }));
  };

  // Validate form data
  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return false;
    }
    if (!formData.details.trim()) {
      Alert.alert('Validation Error', 'Product details are required');
      return false;
    }
    if (!formData.unit.trim()) {
      Alert.alert('Validation Error', 'Unit is required');
      return false;
    }
    if (!formData.quantityInStore || parseFloat(formData.quantityInStore) < 0) {
      Alert.alert('Validation Error', 'Valid quantity in store is required');
      return false;
    }
    if (!formData.pricePerUnit || parseFloat(formData.pricePerUnit) <= 0) {
      Alert.alert('Validation Error', 'Valid price per unit is required');
      return false;
    }
    return true;
  };

  // Create new product
  const createProduct = async () => {
    if (!validateForm()) return;

    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name.trim());
    formDataToSend.append('details', formData.details.trim());
    formDataToSend.append('unit', formData.unit.trim());
    formDataToSend.append('quantityInStore', formData.quantityInStore);
    formDataToSend.append('pricePerUnit', formData.pricePerUnit);

    if (formData.image1) {
      formDataToSend.append('image1', formData.image1);
    }
    if (formData.image2) {
      formDataToSend.append('image2', formData.image2);
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/admin/products`, {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Product created successfully!');
        resetForm();
        fetchProducts();
      } else {
        Alert.alert('Error', data.message || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert('Error', 'Network error while creating product');
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const updateProduct = async () => {
    if (!validateForm()) return;

    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name.trim());
    formDataToSend.append('details', formData.details.trim());
    formDataToSend.append('unit', formData.unit.trim());
    formDataToSend.append('quantityInStore', formData.quantityInStore);
    formDataToSend.append('pricePerUnit', formData.pricePerUnit);

    if (formData.image1) {
      formDataToSend.append('image1', formData.image1);
    }
    if (formData.image2) {
      formDataToSend.append('image2', formData.image2);
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        body: formDataToSend,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Product updated successfully!');
        resetForm();
        fetchProducts();
      } else {
        Alert.alert('Error', data.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Network error while updating product');
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const deleteProduct = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${BASE_URL}/api/admin/products/${id}`, {
                method: 'DELETE',
              });

              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Product deleted successfully!');
                fetchProducts();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete product');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Network error while deleting product');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Start editing product
  const startEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      details: product.details,
      unit: product.unit,
      quantityInStore: product.quantityInStore.toString(),
      pricePerUnit: product.pricePerUnit.toString(),
      image1: null,
      image2: null,
    });
    setShowForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      details: '',
      unit: '',
      quantityInStore: '',
      pricePerUnit: '',
      image1: null,
      image2: null,
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  // Calculate total value
  const calculateTotalValue = () => {
    const quantity = parseFloat(formData.quantityInStore) || 0;
    const price = parseFloat(formData.pricePerUnit) || 0;
    return (quantity * price).toFixed(2);
  };

  // Render product item
  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => startEdit(item)}
          >
            <Icon name="edit" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteProduct(item.id)}
          >
            <Icon name="delete" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.productDetails}>{item.details}</Text>

      <View style={styles.productInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Quantity in Store:</Text>
          <Text style={styles.infoValue}>{item.quantityInStore} {item.unit}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Price per Unit:</Text>
          <Text style={styles.infoValue}>₹{item.pricePerUnit}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Value:</Text>
          <Text style={styles.totalValue}>₹{(item.quantityInStore * item.pricePerUnit).toFixed(2)}</Text>
        </View>
      </View>

      {/* Product Images */}
      {(item.image1 || item.image2) && (
        <View style={styles.productImages}>
          {item.image1 && (
            <Image
              source={{ uri: `${BASE_URL}/uploads/${item.image1}` }}
              style={styles.productImage}
            />
          )}
          {item.image2 && (
            <Image
              source={{ uri: `${BASE_URL}/uploads/${item.image2}` }}
              style={styles.productImage}
            />
          )}
        </View>
      )}

      <Text style={styles.productDate}>
        Created: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Product Management</Text>
          <Text style={styles.subtitle}>Admin Panel</Text>
        </View>

        {/* Control Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => setShowForm(!showForm)}
          >
            <Icon name="add" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>
              {showForm ? 'Cancel' : 'Add Product'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setShowProducts(!showProducts)}
          >
            <Icon name="inventory" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>
              {showProducts ? 'Hide Products' : `Products (${products.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* Product Form */}
        {showForm && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholder="Enter product name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Details *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.details}
                onChangeText={(text) => handleInputChange('details', text)}
                placeholder="Enter product details"
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={4}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Unit *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.unit}
                  onChangeText={(text) => handleInputChange('unit', text)}
                  placeholder="e.g., kg, pcs, liters"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>Quantity in Store *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.quantityInStore}
                  onChangeText={(text) => handleInputChange('quantityInStore', text)}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price per Unit *</Text>
              <TextInput
                style={styles.input}
                value={formData.pricePerUnit}
                onChangeText={(text) => handleInputChange('pricePerUnit', text)}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            {/* Total Value Display */}
            {(formData.quantityInStore && formData.pricePerUnit) && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>
                  Total Value: ₹{calculateTotalValue()}
                </Text>
              </View>
            )}

            {/* Image Selection */}
            <View style={styles.imageContainer}>
              <Text style={styles.label}>Product Images (Optional)</Text>
              <View style={styles.imageRow}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={() => selectImage('image1')}
                >
                  {formData.image1 ? (
                    <View style={styles.imagePreview}>
                      <Image source={{ uri: formData.image1.uri }} style={styles.selectedImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage('image1')}
                      >
                        <Icon name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imageButtonContent}>
                      <Icon name="add-a-photo" size={24} color="#666" />
                      <Text style={styles.imageButtonText}>Image 1</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={() => selectImage('image2')}
                >
                  {formData.image2 ? (
                    <View style={styles.imagePreview}>
                      <Image source={{ uri: formData.image2.uri }} style={styles.selectedImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage('image2')}
                      >
                        <Icon name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imageButtonContent}>
                      <Icon name="add-a-photo" size={24} color="#666" />
                      <Text style={styles.imageButtonText}>Image 2</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Actions */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.button, styles.successButton]}
                onPress={editingProduct ? updateProduct : createProduct}
                disabled={loading}
              >
                <Icon 
                  name={editingProduct ? "update" : "add"} 
                  size={20} 
                  color="#fff" 
                  style={styles.buttonIcon} 
                />
                <Text style={styles.buttonText}>
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={resetForm}
              >
                <Icon name="cancel" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Products List */}
        {showProducts && (
          <View style={styles.productsContainer}>
            <Text style={styles.sectionTitle}>All Products ({products.length})</Text>

            {products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="inventory" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>Add your first product!</Text>
              </View>
            ) : (
              <FlatList
                data={products}
                renderItem={renderProductItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8E8E93',
  },
  formContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  halfInput: {
    flex: 1,
  },
  totalContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  imageContainer: {
    marginBottom: 15,
  },
  imageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  imageButton: {
    flex: 1,
    height: 120,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  imageButtonContent: {
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  productsContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    marginBottom: 5,
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 6,
  },
  productDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  productInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  productImages: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productDate: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});

export default Product;