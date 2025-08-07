/**
 * @format
 */

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

import {AppRegistry} from 'react-native';
// import App from './App_IPTV_SMARTERS';
import App from './App_IPTV_SMARTERS';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
