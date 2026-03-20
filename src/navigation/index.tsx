// ============================================================
// Navigation — Tab navigator + stack navigators
// ============================================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { HomeScreen } from '../screens/HomeScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { LiveScreen } from '../screens/LiveScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ScanDetailScreen } from '../screens/ScanDetailScreen';
import { RecordingDetailScreen } from '../screens/RecordingDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useThemeColors } from '../utils/hooks';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- Tab icon as text (avoids vector icon dependency) ---
function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <Text style={{ color, fontSize: focused ? 12 : 11, fontWeight: focused ? '600' : '400' }}>
      {label}
    </Text>
  );
}

// --- Home Stack ---
function HomeStack() {
  const theme = useThemeColors();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan Results' }} />
    </Stack.Navigator>
  );
}

// --- History Stack ---
function HistoryStack() {
  const theme = useThemeColors();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text },
      }}
    >
      <Stack.Screen name="HistoryList" component={HistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ScanDetail" component={ScanDetailScreen} options={{ title: 'Scan Detail' }} />
      <Stack.Screen name="RecordingDetail" component={RecordingDetailScreen} options={{ title: 'Recording' }} />
    </Stack.Navigator>
  );
}

// --- Root Tab Navigator ---
export function AppNavigator() {
  const theme = useThemeColors();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{
            tabBarLabel: 'Connect',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon label="[BT]" focused={focused} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="LiveTab"
          component={LiveScreen}
          options={{
            tabBarLabel: 'Live',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon label="~" focused={focused} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="HistoryTab"
          component={HistoryStack}
          options={{
            tabBarLabel: 'History',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon label="[H]" focused={focused} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon label="[S]" focused={focused} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
