import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function Navbar({ navigation, userType = 'customer' }) {
  const navigateWithFallback = (screenName, fallbackMessage) => {
    try {
      navigation.navigate(screenName);
    } catch (error) {
      console.warn(`Navigation to ${screenName} failed:`, error);
      // You could show an alert or navigate to a fallback screen
      alert(fallbackMessage || `${screenName} is not available yet`);
    }
  };

  const renderCustomerNav = () => (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateWithFallback('CustomerScreen', 'Dashboard not available')}
      >
        <Icon name="dashboard" size={24} color="#6366F1" />
        <Text style={styles.navText}>Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateWithFallback('Bills', 'Bills screen not available')}
      >
        <Icon name="receipt" size={24} color="#6366F1" />
        <Text style={styles.navText}>Bills</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateWithFallback('Materials', 'Materials screen not available')}
      >
        <Icon name="inventory" size={24} color="#6366F1" />
        <Text style={styles.navText}>Materials</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAdminNav = () => (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateWithFallback('AdminScreen', 'Admin dashboard not available')}
      >
        <Icon name="admin-panel-settings" size={24} color="#6366F1" />
        <Text style={styles.navText}>Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateWithFallback('Users', 'Users management not available')}
      >
        <Icon name="people" size={24} color="#6366F1" />
        <Text style={styles.navText}>Users</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateWithFallback('CreateOrder', 'Create order not available')}
      >
        <Icon name="add-shopping-cart" size={24} color="#6366F1" />
        <Text style={styles.navText}>Orders</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateWithFallback('Product', 'Products management not available')}
      >
        <Icon name="category" size={24} color="#6366F1" />
        <Text style={styles.navText}>Products</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmployeeNav = () => (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateWithFallback('EmployeeScreen', 'Employee dashboard not available')}
      >
        <Icon name="work" size={24} color="#6366F1" />
        <Text style={styles.navText}>Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateWithFallback('MaterialForm', 'Add material not available')}
      >
        <Icon name="add-box" size={24} color="#6366F1" />
        <Text style={styles.navText}>Add Data</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateWithFallback('MaterialList', 'Material list not available')}
      >
        <Icon name="list" size={24} color="#6366F1" />
        <Text style={styles.navText}>View Data</Text>
      </TouchableOpacity>
    </View>
  );

  // Determine which navigation to show based on user type
  const getUserTypeFromRoute = () => {
    const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index]?.name;
    
    if (currentRoute?.includes('Admin')) return 'admin';
    if (currentRoute?.includes('Employee') && !currentRoute?.includes('Data')) return 'employee';
    if (currentRoute?.includes('Customer') || currentRoute?.includes('Client')) return 'customer';
    
    return userType;
  };

  const currentUserType = getUserTypeFromRoute();

  const renderNavigation = () => {
    switch (currentUserType) {
      case 'admin':
      case 'administrator':
        return renderAdminNav();
      case 'employee':
      case 'field_employee':
      case 'office_employee':
      case 'sale_purchase':
        return renderEmployeeNav();
      case 'customer':
      case 'client':
      default:
        return renderCustomerNav();
    }
  };

  return (
    <View style={styles.wrapper}>
      {renderNavigation()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 70,
  },
  navText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});