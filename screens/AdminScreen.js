import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Provider } from 'react-native-paper';

const AdminScreen = () => {
  const navigation = useNavigation();
  const [usersCount, setUsersCount] = useState(0);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    const loadData = async () => {
      try {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
 
        setTimeout(async () => {
          const response = await fetch('http://192.168.1.22:3000/counts');
          if (!response.ok) throw new Error('Failed to fetch counts');
          const data = await response.json();
 
          setUsersCount(data.usersCount);
          setMaterialsCount(data.materialsCount);
        
          setProjectsCount(data.projectsCount);
        }, 500);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
 
    loadData();
  }, []);

  const handleNavigation = (route) => {
    if (route === '#') {
      Alert.alert('Coming Soon', 'This feature will be available soon!');
      return;
    }
    navigation.navigate(route);
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => navigation.replace('Login') },
      ]
    );
  };

  const StatsCard = ({ icon, title, count, color, gradient, route, delay = 0 }) => {
    const cardFadeAnim = new Animated.Value(0);
    const cardSlideAnim = new Animated.Value(30);

    React.useEffect(() => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(cardFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cardSlideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: cardFadeAnim,
            transform: [{ translateY: cardSlideAnim }],
          },
        ]}
      >
        <TouchableOpacity 
          style={[styles.statsCard, { backgroundColor: color }]} 
          onPress={() => handleNavigation(route)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: gradient }]}>
              <Ionicons name={icon} size={24} color="#fff" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardCount}>{count.toLocaleString()}</Text>
              <Text style={styles.cardTitle}>{title}</Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardSubtext}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const QuickAction = ({ icon, title, color, onPress }) => (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <Provider>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.adminTitle}>Admin Dashboard</Text>
              </View>
              <TouchableOpacity style={styles.profileButton}>
                <Ionicons name="person-circle-outline" size={32} color="#6366f1" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.statsContainer}>
            <StatsCard
              icon="people-outline"
              title="Total Users"
              count={usersCount}
              color="#6366f1"
              gradient="rgba(99, 102, 241, 0.2)"
              route="Users"
              delay={100}
            />
            <StatsCard
              icon="folder-outline"
              title="Product"
              count={materialsCount}
              color="#10b981"
              gradient="rgba(16, 185, 129, 0.2)"
              route="Product"
              delay={200}
            />
            <StatsCard
              icon="bar-chart-outline"
              title="CreateOrder"
              count={materialsCount}
              color="#f59e0b"
              gradient="rgba(245, 158, 11, 0.2)"
              route="CreateOrder"
              delay={300}
            />
            <StatsCard
              icon="briefcase-outline"
              title="EmployeeData"
              count={projectsCount}
              color="#ef4444"
              gradient="rgba(239, 68, 68, 0.2)"
              route="EmployeeData"
              delay={400}
            />
          </View>

          <Animated.View 
            style={[
              styles.quickActionsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <QuickAction
                icon="add-circle-outline"
                title="Add User"
                color="#6366f1"
                onPress={() => Alert.alert('Add User', 'Navigate to add user screen')}
              />
              <QuickAction
                icon="document-text-outline"
                title="Generate Report"
                color="#10b981"
                onPress={() => Alert.alert('Generate Report', 'Report generation started')}
              />
              <QuickAction
                icon="settings-outline"
                title="Settings"
                color="#f59e0b"
                onPress={() => Alert.alert('Settings', 'Navigate to settings')}
              />
              <QuickAction
                icon="notifications-outline"
                title="Notifications"
                color="#8b5cf6"
                onPress={() => Alert.alert('Notifications', 'View all notifications')}
              />
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.logoutContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  adminTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cardContainer: {
    marginBottom: 16,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AdminScreen;