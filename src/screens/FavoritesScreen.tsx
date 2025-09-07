/**
 * P IPTV Mobile App - �cran Favoris
 */

import React from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

const FavoritesScreen: React.FC = () => {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView>
        <View style={styles.content}>
          <Text
            variant="headlineMedium"
            style={{color: theme.colors.onBackground}}>
            P Favoris
          </Text>
          <Text style={{color: theme.colors.onSurfaceVariant, marginTop: 16}}>
            Cha�nes favorites � impl�menter
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16},
});

export default FavoritesScreen;
