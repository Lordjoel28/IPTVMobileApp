/**
 * 📱 App Simple - Test interface IPTV Smarters Pro
 * Version sans navigation complexe pour tests
 */

import React, { useState } from 'react';
import { ThemeProvider } from './src/context/ThemeContext';
import IPTVSmartersHomeScreen from './src/screens/IPTVSmartersHomeScreen';
import IPTVSmartersChannelsScreen from './src/screens/IPTVSmartersChannelsScreen';

// Navigation simple avec state
interface SimpleNavigation {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [screenParams, setScreenParams] = useState<any>({});

  const navigation: SimpleNavigation = {
    navigate: (screen: string, params?: any) => {
      setCurrentScreen(screen);
      setScreenParams(params || {});
    },
    goBack: () => {
      setCurrentScreen('Home');
      setScreenParams({});
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return <IPTVSmartersHomeScreen navigation={navigation} />;
      case 'LiveChannels':
        return <IPTVSmartersChannelsScreen navigation={navigation} />;
      default:
        return <IPTVSmartersHomeScreen navigation={navigation} />;
    }
  };

  return (
    <ThemeProvider>
      {renderScreen()}
    </ThemeProvider>
  );
};

export default App;