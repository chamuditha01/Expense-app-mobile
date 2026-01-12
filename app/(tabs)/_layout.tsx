import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: '#fff' },
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 16, fontWeight: '900' },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { height: 60, paddingBottom: 5, display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: 'NANOTRACK',
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          headerTitle: 'ANALYTICS',
          title: 'Analytics',
          tabBarIcon: ({ color }) => <Ionicons name="pie-chart" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}