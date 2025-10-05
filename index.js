/**
 * @format
 */

// react-native-gesture-handler DOIT être importé en premier (requis React Navigation)
import 'react-native-gesture-handler';

// Polyfill Buffer pour React Native
import {Buffer} from 'buffer';
global.Buffer = Buffer;

// Polyfill Base64 pour React Native
if (typeof global.btoa === 'undefined') {
  global.btoa = function (str) {
    return Buffer.from(str, 'utf8').toString('base64');
  };
}
if (typeof global.atob === 'undefined') {
  global.atob = function (str) {
    return Buffer.from(str, 'base64').toString('utf8');
  };
}
console.log('🔧 Buffer & Base64 polyfills loaded:', typeof global.Buffer, typeof global.btoa);

// Supprimer warning NativeEventEmitter pour react-native-voice
// TODO: À supprimer quand react-native-voice sera mis à jour
import { LogBox } from 'react-native';
LogBox.ignoreLogs([
  'new NativeEventEmitter()', // Warning lié à react-native-voice
  'removeListeners', // Warning lié à NativeEventEmitter
]);

// Activer react-native-screens pour React Navigation
import {enableScreens} from 'react-native-screens';
enableScreens();

import {AppRegistry} from 'react-native';
// AppWithNavigation remplacé par App.tsx unifié (architecture moderne)
import App from './App'; // Point d'entrée unifié avec Zustand + DI
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
