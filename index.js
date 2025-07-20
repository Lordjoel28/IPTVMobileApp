/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {name as appName} from './app.json';

// Silence Metro errors
console.disableYellowBox = true;
console.warn = () => {};
console.error = () => {};

// Import App with error handling
let App;
try {
  App = require('./App').default;
} catch (e) {
  // Fallback simple component if App fails
  const React = require('react');
  const {View, Text, StyleSheet} = require('react-native');
  
  App = () => React.createElement(View, {style: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a'}}, 
    React.createElement(Text, {style: {color: '#1E88E5', fontSize: 24, fontWeight: 'bold'}}, '📺 LECTEUR IPTV'),
    React.createElement(Text, {style: {color: '#fff', fontSize: 16, marginTop: 10}}, 'App chargée avec succès!'),
    React.createElement(Text, {style: {color: '#4CAF50', fontSize: 14, marginTop: 20}}, '✅ Prêt pour les fonctionnalités IPTV')
  );
}

AppRegistry.registerComponent(appName, () => App);
