#!/usr/bin/env node

/**
 * Script de test pour les solutions EPG
 * Permet de tester rapidement différents composants EPG
 */

const fs = require('fs');
const path = require('path');

const CHANNEL_PLAYER_SCREEN_PATH = 'src/screens/ChannelPlayerScreen.tsx';

const EPG_SOLUTIONS = {
  EPGFixed: {
    import:
      "import EPGFixed from '../components/EPGFixed'; // Solution finale complète",
    component: 'EPGFixed',
    description:
      '🎯 Version finale - couleurs modernes + synchronisation + scroll stable',
  },
  EPGGridSimple: {
    import:
      "import EPGGridSimple from '../components/EPGGridSimple'; // Version originale (problématique)",
    component: 'EPGGridSimple',
    description: '❌ Version originale avec problèmes',
  },
};

function switchEPGComponent(solutionName) {
  const solution = EPG_SOLUTIONS[solutionName];
  if (!solution) {
    console.error('❌ Solution inconnue:', solutionName);
    console.log('Solutions disponibles:', Object.keys(EPG_SOLUTIONS));
    return false;
  }

  console.log(`🔄 Changement vers: ${solutionName} - ${solution.description}`);

  try {
    let content = fs.readFileSync(CHANNEL_PLAYER_SCREEN_PATH, 'utf8');

    // Remplacer l'import
    content = content.replace(
      /import EPG\w+ from '\.\.\/components\/EPG\w+'; \/\/ .*/,
      solution.import,
    );

    // Remplacer le composant dans le JSX
    content = content.replace(/<EPG\w+\s/g, `<${solution.component} `);

    // Remplacer la fermeture du composant
    content = content.replace(/\/>/g, '/>');

    fs.writeFileSync(CHANNEL_PLAYER_SCREEN_PATH, content);

    console.log('✅ Fichier modifié avec succès');
    console.log(`📱 Composant EPG changé vers: ${solutionName}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la modification:', error.message);
    return false;
  }
}

// Main
const solutionName = process.argv[2];

if (!solutionName) {
  console.log('🎯 Script de test des solutions EPG');
  console.log('Usage: node test-epg-solutions.js <SOLUTION_NAME>');
  console.log('\nSolutions disponibles:');

  Object.entries(EPG_SOLUTIONS).forEach(([name, info]) => {
    console.log(`  • ${name}: ${info.description}`);
  });

  process.exit(1);
}

switchEPGComponent(solutionName);
