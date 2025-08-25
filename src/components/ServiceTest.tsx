/**
 * 🧪 Service Test Component - Validation du système DI
 * Composant de test pour vérifier que les services fonctionnent
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ServiceMigration, ServiceNames, getService } from '../core';
import type { ServiceName } from '../core';

interface ServiceTestProps {
  visible?: boolean;
}

export const ServiceTest: React.FC<ServiceTestProps> = ({ visible = false }) => {
  const [testResults, setTestResults] = useState<{
    passed: string[];
    failed: string[];
  }>({ passed: [], failed: [] });
  
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Test automatique au montage du composant
  useEffect(() => {
    if (visible) {
      runServiceTests();
    }
  }, [visible]);

  const runServiceTests = async () => {
    setTesting(true);
    
    try {
      // Obtient le statut de la migration
      const status = ServiceMigration.getMigrationStatus();
      setMigrationStatus(status);

      // Test tous les services
      const results = await ServiceMigration.validateAllServices();
      setTestResults(results);
      
    } catch (error) {
      console.error('Service tests failed:', error);
      setTestResults({
        passed: [],
        failed: ['Global test failure: ' + error.message]
      });
    }
    
    setTesting(false);
  };

  const testSpecificService = async (serviceName: ServiceName) => {
    try {
      const service = await getService(serviceName);
      console.log(`✅ Service ${serviceName} works:`, service);
      
      // Met à jour les résultats
      setTestResults(prev => ({
        passed: [...prev.passed.filter(s => s !== serviceName), serviceName],
        failed: prev.failed.filter(s => s !== serviceName)
      }));
    } catch (error) {
      console.error(`❌ Service ${serviceName} failed:`, error);
      
      setTestResults(prev => ({
        passed: prev.passed.filter(s => s !== serviceName),
        failed: [...prev.failed.filter(s => s !== serviceName), serviceName]
      }));
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏗️ Service Architecture Test</Text>
      
      {/* Layout 2 colonnes */}
      <View style={styles.columnsContainer}>
        
        {/* Colonne gauche */}
        <View style={styles.column}>
          {/* Migration Status */}
          <View style={styles.compactSection}>
            <Text style={styles.compactSectionTitle}>Migration Status</Text>
            {migrationStatus ? (
              <View>
                <Text style={styles.compactStatus}>
                  ✅ Init: {migrationStatus.initialized ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.compactStatus}>
                  📊 Services: {migrationStatus.servicesRegistered}
                </Text>
              </View>
            ) : (
              <Text style={styles.compactStatus}>Loading...</Text>
            )}
          </View>

          {/* Test Results */}
          <View style={styles.compactSection}>
            <Text style={styles.compactSectionTitle}>✅ Passed ({testResults.passed.length})</Text>
            {testResults.passed.slice(0, 5).map((service) => (
              <Text key={service} style={styles.compactService}>• {service}</Text>
            ))}
          </View>

          {/* Failed Results */}
          <View style={styles.compactSection}>
            <Text style={styles.compactSectionTitle}>❌ Failed ({testResults.failed.length})</Text>
            {testResults.failed.slice(0, 3).map((service) => (
              <Text key={service} style={styles.compactFailedService}>• {service}</Text>
            ))}
          </View>
        </View>

        {/* Colonne droite */}
        <View style={styles.column}>
          {/* Remaining Passed Services */}
          <View style={styles.compactSection}>
            <Text style={styles.compactSectionTitle}>✅ More Passed</Text>
            {testResults.passed.slice(5).map((service) => (
              <Text key={service} style={styles.compactService}>• {service}</Text>
            ))}
          </View>

          {/* Individual Service Tests - Compact */}
          <View style={styles.compactSection}>
            <Text style={styles.compactSectionTitle}>Quick Tests</Text>
            {Object.values(ServiceNames).slice(0, 4).map((serviceName) => (
              <TouchableOpacity
                key={serviceName}
                style={[
                  styles.compactServiceButton,
                  testResults.passed.includes(serviceName) && styles.compactPassedButton,
                  testResults.failed.includes(serviceName) && styles.compactFailedButton,
                ]}
                onPress={() => testSpecificService(serviceName as ServiceName)}
              >
                <Text style={styles.compactServiceButtonText}>
                  {serviceName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.compactSection}>
            <TouchableOpacity
              style={[styles.compactActionButton, testing && styles.disabledButton]}
              onPress={runServiceTests}
              disabled={testing}
            >
              <Text style={styles.compactActionButtonText}>
                {testing ? '⏳ Testing...' : '🔄 Run All'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    height: 600,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 10,
    zIndex: 1000,
    padding: 15,
  },
  columnsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
  },
  column: {
    flex: 0.48,
    paddingHorizontal: 5,
  },
  compactSection: {
    marginBottom: 8,
    padding: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
  },
  compactSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  compactStatus: {
    color: '#fff',
    fontSize: 9,
    marginBottom: 2,
  },
  compactService: {
    color: '#4CAF50',
    fontSize: 8,
    marginLeft: 3,
    marginBottom: 1,
  },
  compactFailedService: {
    color: '#f44336',
    fontSize: 8,
    marginLeft: 3,
    marginBottom: 1,
  },
  compactServiceButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 4,
    borderRadius: 3,
    marginBottom: 2,
    alignItems: 'center',
  },
  compactPassedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
  },
  compactFailedButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.25)',
  },
  compactServiceButtonText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  compactActionButton: {
    backgroundColor: '#2196F3',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  compactActionButtonText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  status: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  resultSection: {
    marginBottom: 15,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  passedService: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 10,
  },
  failedService: {
    color: '#f44336',
    fontSize: 12,
    marginLeft: 10,
  },
  serviceButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  passedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  failedButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  serviceButtonText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});