/**
 * Test simple pour vérifier que EPGInstantManager fonctionne
 */

// Simuler les imports comme si on était dans React Native
const EPGData = {
  currentProgram: null,
  nextProgram: null,
  progressPercentage: 0,
  remainingMinutes: 0,
  programStartTime: '',
  programEndTime: '',
  isRealData: false,
  lastUpdated: Date.now(),
};

// Test simple de génération de données instantanées
function testEPGInstant() {
  console.log('🧪 Test EPG Instantané');

  const now = new Date();
  const startHour = Math.floor(now.getHours() / 2) * 2;
  const startTime = new Date(now);
  startTime.setHours(startHour, 0, 0, 0);

  const endTime = new Date(startTime);
  endTime.setHours(startTime.getHours() + 2);

  console.log(`⏰ Heure courante: ${now.toLocaleTimeString()}`);
  console.log(
    `📅 Programme actuel: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`,
  );

  const currentTime = now.getTime();
  const totalDuration = endTime.getTime() - startTime.getTime();
  const elapsed = currentTime - startTime.getTime();
  const progressPercentage = Math.max(
    0,
    Math.min(100, (elapsed / totalDuration) * 100),
  );

  console.log(`📊 Progression: ${progressPercentage.toFixed(1)}%`);

  return {
    currentProgram: {
      id: `test-current-${startTime.getTime()}`,
      title: `Programme de ${startHour}h00`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isLive: true,
    },
    progressPercentage,
    isRealData: false,
  };
}

// Exécuter le test
const result = testEPGInstant();
console.log('✅ Résultat test:', JSON.stringify(result, null, 2));
