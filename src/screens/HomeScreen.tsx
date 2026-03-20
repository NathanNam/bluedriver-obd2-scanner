// ============================================================
// HomeScreen — BT device discovery, connection, mode selection
// ============================================================

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBluetoothStore } from '../store/bluetoothStore';
import { ConnectionStatusBar } from '../components/ConnectionStatusBar';
import { DiscoveredDevice } from '../types';
import { useThemeColors } from '../utils/hooks';
import { spacing, fontSize, borderRadius } from '../utils/theme';

export function HomeScreen({ navigation }: any) {
  const theme = useThemeColors();
  const {
    connectionState,
    discoveredDevices,
    connectedDeviceName,
    error,
    startScan,
    stopScan,
    connect,
    disconnect,
    clearError,
  } = useBluetoothStore();

  useEffect(() => {
    if (error) {
      Alert.alert('Connection Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleScanPress = useCallback(() => {
    if (connectionState === 'SCANNING') {
      stopScan();
    } else {
      startScan();
    }
  }, [connectionState]);

  const handleDevicePress = useCallback(async (device: DiscoveredDevice) => {
    stopScan();
    await connect(device.id);
  }, []);

  const handleDisconnect = useCallback(() => {
    Alert.alert('Disconnect', 'Disconnect from the adapter?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: disconnect },
    ]);
  }, []);

  const isReady = connectionState === 'READY';

  const renderDevice = ({ item }: { item: DiscoveredDevice }) => (
    <TouchableOpacity
      style={[styles.deviceRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => handleDevicePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceName, { color: theme.text }]}>
          {item.name || 'Unknown Device'}
        </Text>
        <Text style={[styles.deviceId, { color: theme.textSecondary }]}>{item.id}</Text>
      </View>
      {item.rssi !== null && (
        <Text style={[styles.rssi, { color: theme.textTertiary }]}>{item.rssi} dBm</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>OBD2 Scanner</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Connect to your vehicle adapter
        </Text>
      </View>

      {/* Connection Status */}
      <View style={styles.section}>
        <ConnectionStatusBar state={connectionState} deviceName={connectedDeviceName} />
      </View>

      {/* Scan / Disconnect Button */}
      <View style={styles.section}>
        {isReady ? (
          <TouchableOpacity
            style={[styles.disconnectButton, { borderColor: theme.disconnected }]}
            onPress={handleDisconnect}
          >
            <Text style={[styles.disconnectText, { color: theme.disconnected }]}>
              Disconnect
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.scanButton,
              {
                backgroundColor:
                  connectionState === 'SCANNING' ? theme.textSecondary : theme.primary,
              },
            ]}
            onPress={handleScanPress}
            disabled={
              connectionState === 'CONNECTING' || connectionState === 'INITIALIZING'
            }
          >
            <Text style={styles.scanButtonText}>
              {connectionState === 'SCANNING' ? 'Stop Scanning' : 'Scan for Devices'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Discovered Devices */}
      {!isReady && discoveredDevices.length > 0 && (
        <View style={styles.deviceListSection}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            DISCOVERED DEVICES
          </Text>
          <FlatList
            data={discoveredDevices}
            keyExtractor={(item) => item.id}
            renderItem={renderDevice}
            style={styles.deviceList}
          />
        </View>
      )}

      {/* Mode Selection (shown when connected) */}
      {isReady && (
        <View style={styles.modeSection}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            CHOOSE SCAN MODE
          </Text>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.navigate('Scan')}
            activeOpacity={0.7}
          >
            <View style={[styles.modeIcon, { backgroundColor: theme.primary + '15' }]}>
              <Text style={styles.modeIconText}>{'{ }'}</Text>
            </View>
            <View style={styles.modeInfo}>
              <Text style={[styles.modeName, { color: theme.text }]}>One-Time Scan</Text>
              <Text style={[styles.modeDesc, { color: theme.textSecondary }]}>
                Read fault codes, VIN, and vehicle info
              </Text>
            </View>
            <Text style={[styles.arrow, { color: theme.textTertiary }]}>{'>'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.navigate('LiveTab')}
            activeOpacity={0.7}
          >
            <View style={[styles.modeIcon, { backgroundColor: theme.success + '15' }]}>
              <Text style={styles.modeIconText}>~</Text>
            </View>
            <View style={styles.modeInfo}>
              <Text style={[styles.modeName, { color: theme.text }]}>Live Scan</Text>
              <Text style={[styles.modeDesc, { color: theme.textSecondary }]}>
                Real-time gauges, charts, and recording
              </Text>
            </View>
            <Text style={[styles.arrow, { color: theme.textTertiary }]}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  scanButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  disconnectButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  disconnectText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  deviceListSection: {
    flex: 1,
  },
  deviceList: {
    paddingHorizontal: spacing.lg,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  deviceId: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  rssi: {
    fontSize: fontSize.sm,
  },
  modeSection: {
    flex: 1,
    paddingTop: spacing.md,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconText: {
    fontSize: fontSize.xl,
  },
  modeInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  modeName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  modeDesc: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  arrow: {
    fontSize: fontSize.xl,
    fontWeight: '300',
  },
});
