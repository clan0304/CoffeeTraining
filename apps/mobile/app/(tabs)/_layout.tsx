import { useAuth } from '@clerk/clerk-expo'
import { Redirect, Tabs } from 'expo-router'
import { Text } from 'react-native'

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    'Cup Tasters': '☕',
    Cupping: '📋',
    Dashboard: '📊',
    Profile: '👤',
  }
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>
      {icons[label] || '•'}
    </Text>
  )
}

export default function TabsLayout() {
  const { isSignedIn } = useAuth()

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e5e5e5',
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cup-tasters"
        options={{
          title: 'Cup Tasters',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Cup Tasters" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cupping"
        options={{
          title: 'Cupping',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Cupping" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Dashboard" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  )
}
