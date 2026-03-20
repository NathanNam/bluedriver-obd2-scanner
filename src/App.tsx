import { useState } from 'react';
import { useThemeColors } from './utils/hooks';
import { HomeScreen } from './screens/HomeScreen';
import { ScanScreen } from './screens/ScanScreen';
import { LiveScreen } from './screens/LiveScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ScanDetailScreen } from './screens/ScanDetailScreen';
import { RecordingDetailScreen } from './screens/RecordingDetailScreen';
import { SettingsScreen } from './screens/SettingsScreen';

type Tab = 'connect' | 'live' | 'history' | 'settings';

interface ViewState {
  screen: string;
  params?: any;
}

export function App() {
  const theme = useThemeColors();
  const [activeTab, setActiveTab] = useState<Tab>('connect');
  const [viewStack, setViewStack] = useState<Record<Tab, ViewState>>({
    connect: { screen: 'home' },
    live: { screen: 'live' },
    history: { screen: 'historyList' },
    settings: { screen: 'settings' },
  });

  const navigate = (screen: string, params?: any) => {
    setViewStack((prev) => ({
      ...prev,
      [activeTab]: { screen, params },
    }));
  };

  const currentView = viewStack[activeTab];

  const renderContent = () => {
    switch (currentView.screen) {
      case 'home':
        return <HomeScreen onNavigate={navigate} />;
      case 'scan':
        return <ScanScreen onNavigate={navigate} />;
      case 'live':
        return <LiveScreen />;
      case 'historyList':
        return <HistoryScreen onNavigate={navigate} />;
      case 'scanDetail':
        return <ScanDetailScreen params={currentView.params} />;
      case 'recordingDetail':
        return <RecordingDetailScreen params={currentView.params} />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen onNavigate={navigate} />;
    }
  };

  const handleTabPress = (tab: Tab) => {
    if (tab === activeTab) {
      // Reset to root screen of this tab
      const roots: Record<Tab, string> = {
        connect: 'home',
        live: 'live',
        history: 'historyList',
        settings: 'settings',
      };
      setViewStack((prev) => ({ ...prev, [tab]: { screen: roots[tab] } }));
    }
    setActiveTab(tab);
  };

  // Show back button if not on a root screen
  const rootScreens = ['home', 'live', 'historyList', 'settings'];
  const showBack = !rootScreens.includes(currentView.screen);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'connect', label: 'Connect', icon: 'BT' },
    { key: 'live', label: 'Live', icon: '~' },
    { key: 'history', label: 'History', icon: 'H' },
    { key: 'settings', label: 'Settings', icon: 'S' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      maxWidth: 480,
      margin: '0 auto',
      background: theme.background,
      position: 'relative',
    }}>
      {/* Back button header */}
      {showBack && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: `1px solid ${theme.border}`,
          background: theme.surface,
        }}>
          <button
            onClick={() => {
              const roots: Record<Tab, string> = { connect: 'home', live: 'live', history: 'historyList', settings: 'settings' };
              navigate(roots[activeTab]);
            }}
            style={{ color: theme.primary, fontSize: 15, fontWeight: 600 }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {renderContent()}
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        borderTop: `1px solid ${theme.border}`,
        background: theme.surface,
        padding: '6px 0 env(safe-area-inset-bottom, 8px)',
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabPress(tab.key)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 0',
                color: isActive ? theme.primary : theme.textSecondary,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 400 }}>
                [{tab.icon}]
              </span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
