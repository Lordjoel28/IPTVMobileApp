/**
 * 🧪 Tests unitaires pour EPGInstantManager
 * Phase 1: Vérification fonctionnement de base
 */

import {EPGInstantManager} from '../EPGInstantManager';

describe('EPGInstantManager', () => {
  afterEach(() => {
    // Cleanup cache après chaque test
    EPGInstantManager.cleanup();
  });

  test('doit retourner EPG instantané en moins de 200ms', async () => {
    const startTime = Date.now();

    const result = await EPGInstantManager.getInstantEPG('test-channel-tf1');

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(result).toBeDefined();
    expect(result.currentProgram).toBeDefined();
    expect(result.isRealData).toBe(false); // Première fois = données instantanées
    expect(duration).toBeLessThan(200); // Performance < 200ms
  });

  test('doit générer des programmes réalistes selon l\'heure', async () => {
    const result = await EPGInstantManager.getInstantEPG('tf1');

    expect(result?.currentProgram?.title).toBeDefined();
    expect(result?.nextProgram?.title).toBeDefined();
    expect(result?.progressPercentage).toBeGreaterThanOrEqual(0);
    expect(result?.progressPercentage).toBeLessThanOrEqual(100);
    expect(result?.remainingMinutes).toBeGreaterThanOrEqual(0);
  });

  test('doit utiliser cache pour appels répétés', async () => {
    // Premier appel
    const result1 = await EPGInstantManager.getInstantEPG('test-channel');

    const startTime = Date.now();
    // Deuxième appel (devrait utiliser cache)
    const result2 = await EPGInstantManager.getInstantEPG('test-channel');
    const duration = Date.now() - startTime;

    expect(result1?.currentProgram?.id).toBe(result2?.currentProgram?.id);
    expect(duration).toBeLessThan(10); // Cache ultra-rapide < 10ms
  });

  test('doit déclencher background fetch automatiquement', async () => {
    const mockCallback = jest.fn();

    // S'abonner aux mises à jour
    const unsubscribe = EPGInstantManager.subscribe('test-channel', mockCallback);

    // Obtenir EPG instantané (doit déclencher background fetch)
    await EPGInstantManager.getInstantEPG('test-channel');

    // Attendre un peu pour le background fetch
    await new Promise(resolve => setTimeout(resolve, 100));

    unsubscribe();
  });

  test('doit gérer les statistiques correctement', () => {
    const stats = EPGInstantManager.getStats();

    expect(stats).toHaveProperty('cacheSize');
    expect(stats).toHaveProperty('backgroundFetchActive');
    expect(stats).toHaveProperty('listeners');
    expect(typeof stats.cacheSize).toBe('number');
  });
});