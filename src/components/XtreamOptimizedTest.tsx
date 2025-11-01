/**
 * 🧪 Composant de test pour StreamingXtreamService optimisé
 * Test des performances avec playlists 100K+ chaînes
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  useColorScheme,
  ScrollView,
  Alert,
} from 'react-native';
import {usePlaylistImport} from '../hooks/usePlaylistImport';
import BackgroundWorkerService from '../services/BackgroundWorkerService';
import ProgressiveUIService from '../services/ProgressiveUIService';
import CacheIntegrationService from '../services/CacheIntegrationService';
import SmartCacheService from '../services/SmartCacheService';

interface TestCredentials {
  url: string;
  username: string;
  password: string;
  name: string;
}

export const XtreamOptimizedTest: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const {importPlaylistXtream} = usePlaylistImport();

  const [credentials, setCredentials] = useState<TestCredentials>({
    url: '',
    username: '',
    password: '',
    name: 'Test Optimized',
  });

  const [testResults, setTestResults] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Serveurs de test populaires (anonymisés pour exemple)
  const testServers = [
    {
      name: 'Test Server 1 (Small - 1K channels)',
      url: 'http://example1.com:8080',
      username: 'test',
      password: 'test',
    },
    {
      name: 'Test Server 2 (Medium - 10K channels)',
      url: 'http://example2.com:8080',
      username: 'demo',
      password: 'demo',
    },
    {
      name: 'Test Server 3 (Large - 100K+ channels)',
      url: 'http://example3.com:8080',
      username: 'mega',
      password: 'mega',
    },
  ];

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  const testImportOptimized = async () => {
    if (!credentials.url || !credentials.username || !credentials.password) {
      Alert.alert('Error', 'Please fill all credentials');
      return;
    }

    setIsImporting(true);
    addLog(`🚀 Starting optimized import test: ${credentials.name}`);
    addLog(`📡 Server: ${credentials.url}`);
    addLog(`👤 User: ${credentials.username}`);

    const startTime = performance.now();

    try {
      const result = await importPlaylistXtream(
        credentials.url,
        credentials.username,
        credentials.password,
        credentials.name,
      );

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (result.success) {
        addLog(`✅ Import successful in ${duration}ms`);
        addLog(`📊 Channels imported: ${result.channelCount || 'Unknown'}`);
        addLog(`🆔 Playlist ID: ${result.playlistId}`);

        // Performance analysis
        const channelsPerSecond = result.channelCount
          ? Math.round((result.channelCount / duration) * 1000)
          : 0;
        addLog(`⚡ Performance: ${channelsPerSecond} channels/second`);

        Alert.alert(
          'Import Success! 🚀',
          `${result.channelCount} channels imported in ${duration}ms\n\nPerformance: ${channelsPerSecond} channels/second`,
          [{text: 'OK', style: 'default'}],
        );
      } else {
        addLog(`❌ Import failed: ${result.error}`);
        Alert.alert('Import Failed', result.error);
      }
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      addLog(`💥 Import crashed after ${duration}ms: ${error}`);
      Alert.alert('Import Error', `Crashed after ${duration}ms: ${error}`);
    }

    setIsImporting(false);
  };

  const loadTestServer = (server: (typeof testServers)[0]) => {
    setCredentials({
      url: server.url,
      username: server.username,
      password: server.password,
      name: server.name,
    });
  };

  // Test Background Worker Service
  const testBackgroundWorker = async () => {
    addLog('🔄 Testing Background Worker Service...');

    // Start service
    BackgroundWorkerService.start();
    addLog('✅ Background Worker Service started');

    // Add test task
    const taskId = BackgroundWorkerService.addTask({
      id: 'test-normalize-' + Date.now(),
      type: 'NORMALIZE_CHANNELS',
      priority: 'HIGH',
      data: {
        channels: [
          {name: 'Test Channel 1', stream_id: '1', category_id: '1'},
          {name: 'Test Channel 2', stream_id: '2', category_id: '2'},
        ],
        serverUrl: 'http://test.com',
        batchSize: 50,
      },
      onProgress: (progress, message) => {
        addLog(`📊 Worker Progress: ${progress}% - ${message}`);
      },
      onComplete: result => {
        addLog(`✅ Worker Complete: ${result.length} channels processed`);
      },
      onError: error => {
        addLog(`❌ Worker Error: ${error.message}`);
      },
    });

    addLog(`📋 Task queued with ID: ${taskId}`);

    // Show stats after 2 seconds
    setTimeout(() => {
      const stats = BackgroundWorkerService.getStats();
      addLog(
        `📈 Worker Stats: ${stats.tasksCompleted} completed, ${stats.tasksRunning} running, ${stats.tasksQueued} queued`,
      );
    }, 2000);
  };

  // Test Progressive UI Service
  const testProgressiveUI = () => {
    addLog('📱 Testing Progressive UI Service...');

    // Start service
    ProgressiveUIService.start();
    addLog('✅ Progressive UI Service started');

    // Subscribe to updates
    const unsubscribe = ProgressiveUIService.subscribe(update => {
      addLog(`🎨 UI Update: ${update.type} - ${update.priority} priority`);
    });

    // Start progress tracking
    ProgressiveUIService.startProgress(1000);
    addLog('📊 Progress tracking started for 1000 items');

    // Simulate progress updates
    let processed = 0;
    const progressInterval = setInterval(() => {
      processed += 50;
      ProgressiveUIService.updateProgress(processed, 1000);

      if (processed >= 1000) {
        clearInterval(progressInterval);
        addLog('✅ Progress tracking completed');

        // Get performance stats
        const stats = ProgressiveUIService.getPerformanceStats();
        addLog(
          `⚡ Performance: ${stats.currentFPS}fps, ${stats.optimalBatchSize} batch size`,
        );

        // Stop service and unsubscribe
        setTimeout(() => {
          ProgressiveUIService.stop();
          unsubscribe();
          addLog('⏹️ Progressive UI Service stopped');
        }, 1000);
      }
    }, 100);

    // Add some test channels
    ProgressiveUIService.addChannelsBatch(
      [
        {name: 'Channel 1', stream_id: '1'},
        {name: 'Channel 2', stream_id: '2'},
      ],
      1,
    );
  };

  // Test Smart Cache System
  const testSmartCache = async () => {
    addLog('🧠 Testing Smart Cache L1/L2/L3 System...');

    try {
      // Test data
      const testData = {
        channels: [
          {name: 'Test Channel 1', stream_id: '1', category_name: 'Test'},
          {name: 'Test Channel 2', stream_id: '2', category_name: 'Demo'},
        ],
        categories: [
          {category_id: '1', category_name: 'Test Category'},
          {category_id: '2', category_name: 'Demo Category'},
        ],
      };

      // Test caching
      addLog('💾 Testing cache SET operations...');

      await CacheIntegrationService.setCached(
        'test_channels',
        testData.channels,
        'CHANNELS',
      );
      await CacheIntegrationService.setCached(
        'test_categories',
        testData.categories,
        'XTREAM_API',
      );
      await CacheIntegrationService.setCached(
        'test_user_data',
        {userId: '1', favorites: ['1', '2']},
        'USER_DATA',
      );

      addLog('✅ Cache SET completed for 3 different data types');

      // Test retrieving
      addLog('📖 Testing cache GET operations...');

      const cachedChannels = await CacheIntegrationService.getCached(
        'test_channels',
        'CHANNELS',
      );
      const cachedCategories = await CacheIntegrationService.getCached(
        'test_categories',
        'XTREAM_API',
      );
      const cachedUserData = await CacheIntegrationService.getCached(
        'test_user_data',
        'USER_DATA',
      );

      if (cachedChannels) {
        addLog(`✅ Cache HIT: Retrieved ${cachedChannels.length} channels`);
      }
      if (cachedCategories) {
        addLog(`✅ Cache HIT: Retrieved ${cachedCategories.length} categories`);
      }
      if (cachedUserData) {
        addLog(
          `✅ Cache HIT: Retrieved user data for ${cachedUserData.userId}`,
        );
      }

      // Test cache miss
      const missData = await CacheIntegrationService.getCached(
        'non_existent_key',
        'TEMPORARY',
      );
      if (!missData) {
        addLog('✅ Cache MISS: Non-existent key correctly returned null');
      }

      // Get cache statistics
      const metrics = CacheIntegrationService.getCacheMetrics();
      addLog(
        `📊 Cache Stats: L1 ${metrics.l1.items} items, L2 ${metrics.l2.items} items`,
      );
      addLog(
        `📊 Hit Rates: L1 ${(metrics.l1.hitRate * 100).toFixed(1)}%, L2 ${(
          metrics.l2.hitRate * 100
        ).toFixed(1)}%`,
      );
      addLog(
        `📊 Memory Usage: ${(metrics.l1.memoryUsage / 1024 / 1024).toFixed(
          1,
        )}MB`,
      );

      // Test recommendations
      if (metrics.recommendations && metrics.recommendations.length > 0) {
        addLog(`💡 Recommendations: ${metrics.recommendations.join(', ')}`);
      } else {
        addLog('💡 No optimization recommendations - cache running optimally');
      }

      // Test cache cleanup
      addLog('🧹 Testing intelligent cache cleanup...');
      await CacheIntegrationService.performIntelligentCleanup();
      addLog('✅ Cache cleanup completed');

      addLog('🎉 Smart Cache System test completed successfully!');
    } catch (error) {
      addLog(`❌ Smart Cache test failed: ${error}`);
    }
  };

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        🚀 Xtream Optimized Import Test
      </Text>

      <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
        Test performance improvements for 100K+ channels
      </Text>

      {/* Test Servers */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          📡 Test Servers
        </Text>

        {testServers.map((server, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.serverButton, isDarkMode && styles.serverButtonDark]}
            onPress={() => loadTestServer(server)}>
            <Text
              style={[
                styles.serverButtonText,
                isDarkMode && styles.serverButtonTextDark,
              ]}>
              {server.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Manual Credentials */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          🔐 Credentials
        </Text>

        <TextInput
          style={[styles.input, isDarkMode && styles.inputDark]}
          placeholder="Server URL (http://example.com:8080)"
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={credentials.url}
          onChangeText={text => setCredentials(prev => ({...prev, url: text}))}
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, isDarkMode && styles.inputDark]}
          placeholder="Username"
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={credentials.username}
          onChangeText={text =>
            setCredentials(prev => ({...prev, username: text}))
          }
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, isDarkMode && styles.inputDark]}
          placeholder="Password"
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={credentials.password}
          onChangeText={text =>
            setCredentials(prev => ({...prev, password: text}))
          }
          secureTextEntry
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, isDarkMode && styles.inputDark]}
          placeholder="Playlist Name"
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={credentials.name}
          onChangeText={text => setCredentials(prev => ({...prev, name: text}))}
        />
      </View>

      {/* Test Controls */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.testButton,
            isDarkMode && styles.testButtonDark,
            isImporting && styles.testButtonDisabled,
          ]}
          onPress={testImportOptimized}
          disabled={isImporting}>
          <Text
            style={[
              styles.testButtonText,
              isImporting && styles.testButtonTextDisabled,
            ]}>
            {isImporting ? '⏳ Importing...' : '🚀 Test Optimized Import'}
          </Text>
        </TouchableOpacity>

        {/* Phase 2 Test Buttons */}
        <View style={styles.phase2Section}>
          <Text
            style={[styles.phase2Title, isDarkMode && styles.phase2TitleDark]}>
            ⚡ Phase 2 Services Tests
          </Text>

          <TouchableOpacity
            style={[styles.phase2Button, isDarkMode && styles.phase2ButtonDark]}
            onPress={testBackgroundWorker}>
            <Text
              style={[
                styles.phase2ButtonText,
                isDarkMode && styles.phase2ButtonTextDark,
              ]}>
              🔄 Test Background Worker
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.phase2Button, isDarkMode && styles.phase2ButtonDark]}
            onPress={testProgressiveUI}>
            <Text
              style={[
                styles.phase2ButtonText,
                isDarkMode && styles.phase2ButtonTextDark,
              ]}>
              📱 Test Progressive UI
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phase 3 Test Buttons */}
        <View style={styles.phase3Section}>
          <Text
            style={[styles.phase3Title, isDarkMode && styles.phase3TitleDark]}>
            🧠 Phase 3 Smart Cache Tests
          </Text>

          <TouchableOpacity
            style={[styles.phase3Button, isDarkMode && styles.phase3ButtonDark]}
            onPress={testSmartCache}>
            <Text
              style={[
                styles.phase3ButtonText,
                isDarkMode && styles.phase3ButtonTextDark,
              ]}>
              🧠 Test Smart Cache L1/L2/L3
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.clearButton, isDarkMode && styles.clearButtonDark]}
          onPress={clearLogs}>
          <Text
            style={[
              styles.clearButtonText,
              isDarkMode && styles.clearButtonTextDark,
            ]}>
            🧹 Clear Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          📊 Test Results ({testResults.length} logs)
        </Text>

        <View
          style={[styles.logContainer, isDarkMode && styles.logContainerDark]}>
          {testResults.length === 0 ? (
            <Text style={[styles.noLogs, isDarkMode && styles.noLogsDark]}>
              No test results yet. Run a test above.
            </Text>
          ) : (
            testResults.map((log, index) => (
              <Text
                key={index}
                style={[styles.logEntry, isDarkMode && styles.logEntryDark]}
                selectable>
                {log}
              </Text>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitleDark: {
    color: '#999',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  serverButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  serverButtonDark: {
    backgroundColor: '#0056b3',
  },
  serverButtonText: {
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  serverButtonTextDark: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    color: '#333',
  },
  inputDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    color: '#fff',
  },
  testButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  testButtonDark: {
    backgroundColor: '#1e7e34',
  },
  testButtonDisabled: {
    backgroundColor: '#6c757d',
    elevation: 0,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  testButtonTextDisabled: {
    color: '#ccc',
  },
  clearButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  clearButtonDark: {
    backgroundColor: '#495057',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  clearButtonTextDark: {
    color: '#fff',
  },
  logContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  logContainerDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
  },
  noLogs: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  noLogsDark: {
    color: '#999',
  },
  logEntry: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  logEntryDark: {
    color: '#fff',
  },
  phase2Section: {
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  phase2Title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  phase2TitleDark: {
    color: '#0A84FF',
  },
  phase2Button: {
    backgroundColor: '#FF9500',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  phase2ButtonDark: {
    backgroundColor: '#FF8C00',
  },
  phase2ButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  phase2ButtonTextDark: {
    color: '#fff',
  },
  phase3Section: {
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  phase3Title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 12,
    textAlign: 'center',
  },
  phase3TitleDark: {
    color: '#30D158',
  },
  phase3Button: {
    backgroundColor: '#34C759',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  phase3ButtonDark: {
    backgroundColor: '#30D158',
  },
  phase3ButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  phase3ButtonTextDark: {
    color: '#fff',
  },
});

export default XtreamOptimizedTest;
