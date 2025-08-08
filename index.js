/**
 * @format
 */

// react-native-gesture-handler DOIT être importé en premier (requis React Navigation)
import 'react-native-gesture-handler';

// Polyfill Base64 pour React Native
import {encode, decode} from 'base-64';
if (typeof global.btoa === 'undefined') {
  global.btoa = function(str) {
    return encode(str);
  };
}
if (typeof global.atob === 'undefined') {
  global.atob = function(str) {
    return decode(str);
  };
}
console.log('🔧 Base64 polyfill loaded:', typeof global.btoa);

// Activer react-native-screens pour React Navigation
import {enableScreens} from 'react-native-screens';
enableScreens();

import {AppRegistry} from 'react-native';
// import App from './App_IPTV_SMARTERS'; // Version originale sans navigation
import App from './AppWithNavigation'; // Version avec navigation simple
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
