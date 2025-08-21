module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { 'legacy': true }],
    // ['@babel/plugin-proposal-class-properties', { 'loose': true }], // Disabled: conflicts with FlatList getItem
    'react-native-reanimated/plugin' // Plugin requis pour React Native Reanimated (doit être en dernier)
  ],
};
