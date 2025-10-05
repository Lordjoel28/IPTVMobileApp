/**
 * 🔍 Debug EPG Data - Script pour comprendre les données EPG reçues
 */

// Simulation de ce que votre app reçoit probablement
const simulateEPGData = () => {
  console.log('\n🔍 ======= DEBUG EPG DATA =======');

  // Cas 1: Données EPG vides/nulles
  const emptyEPG = {
    currentProgram: null,
    nextProgram: null,
    progressPercentage: 0,
    remainingMinutes: 0,
    programStartTime: '',
    programEndTime: '',
  };

  // Cas 2: Données EPG avec titre court
  const shortTitleEPG = {
    currentProgram: {
      id: 'real-123',
      title: 'JT',  // ← Titre trop court selon ancienne validation
      description: '',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 60*60*1000).toISOString(),
    },
    nextProgram: null,
    progressPercentage: 45,
    remainingMinutes: 30,
    programStartTime: '20:00',
    programEndTime: '21:00',
  };

  // Cas 3: Données EPG avec description vide
  const noDescriptionEPG = {
    currentProgram: {
      id: 'real-456',
      title: 'Journal de 20h',
      description: '',  // ← Description vide
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 60*60*1000).toISOString(),
    },
    nextProgram: {
      id: 'real-457',
      title: 'Koh-Lanta',
      description: 'Court',  // ← Description courte
      startTime: new Date(Date.now() + 60*60*1000).toISOString(),
      endTime: new Date(Date.now() + 2*60*60*1000).toISOString(),
    },
    progressPercentage: 75,
    remainingMinutes: 15,
    programStartTime: '20:00',
    programEndTime: '21:00',
  };

  // Test des validations
  console.log('\n📋 Test validation ANCIENNE (stricte):');
  testOldValidation(emptyEPG, 'EPG vide');
  testOldValidation(shortTitleEPG, 'Titre court');
  testOldValidation(noDescriptionEPG, 'Sans description');

  console.log('\n📋 Test validation NOUVELLE (assouplie):');
  testNewValidation(emptyEPG, 'EPG vide');
  testNewValidation(shortTitleEPG, 'Titre court');
  testNewValidation(noDescriptionEPG, 'Sans description');

  console.log('\n✅ Solution: La nouvelle validation accepte plus de données EPG réelles');
  console.log('=================================\n');
};

// Ancienne validation (stricte)
function testOldValidation(data, caseName) {
  if (!data.currentProgram) {
    console.log(`❌ ${caseName}: Pas de currentProgram`);
    return;
  }

  const isValid = (
    data.currentProgram.title.length > 3 &&
    !data.currentProgram.title.includes('...') &&
    data.currentProgram.description.length > 10  // ← PROBLÈME ICI
  );

  console.log(`${isValid ? '✅' : '❌'} ${caseName}: ${data.currentProgram.title} (desc: ${data.currentProgram.description?.length || 0} chars)`);
}

// Nouvelle validation (assouplie)
function testNewValidation(data, caseName) {
  if (!data.currentProgram) {
    console.log(`❌ ${caseName}: Pas de currentProgram`);
    return;
  }

  const isValid = (
    data.currentProgram.title.length > 1 &&  // ← Plus tolérant
    !data.currentProgram.title.includes('...') &&
    data.currentProgram.title !== 'N/A' &&
    data.currentProgram.title !== 'null' &&
    data.currentProgram.title !== ''
    // ← Plus de vérification description obligatoire
  );

  console.log(`${isValid ? '✅' : '❌'} ${caseName}: ${data.currentProgram.title} (ACCEPTÉ)`);
}

// Exécuter le debug
simulateEPGData();