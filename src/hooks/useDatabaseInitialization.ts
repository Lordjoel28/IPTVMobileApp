/**
 * 🗃️ useDatabaseInitialization - Hook d'initialisation de la base de données
 * Création des index de performance de manière asynchrone et sécurisée
 */

import {useEffect, useRef} from 'react';
import {databaseIndexService} from '../services/DatabaseIndexService';

export const useDatabaseInitialization = () => {
  const initializationDone = useRef(false);

  useEffect(() => {
    const initializeDatabase = async () => {
      if (initializationDone.current) {
        return;
      }

      try {
        console.log('🚀 [useDatabaseInitialization] Démarrage initialisation BDD...');

        // Obtenir des statistiques sur la base (sans index pour l'instant)
        const stats = await databaseIndexService.getDatabaseStats();
        console.log('📊 [useDatabaseInitialization] Stats BDD:', stats);

        // Tenter de créer les index de manière sécurisée
        try {
          await databaseIndexService.createAllIndexes();

          // Obtenir des infos sur les index créés (si disponible)
          const indexInfo = await databaseIndexService.getIndexInfo();
          console.log('📋 [useDatabaseInitialization] Index disponibles:', indexInfo.length);

        } catch (indexError) {
          console.warn('⚠️ [useDatabaseInitialization] Index non créés (normal avec certaines versions):', indexError.message);
          console.log('ℹ️ [useDatabaseInitialization] L\'application fonctionnera sans index optimisés');
        }

        initializationDone.current = true;
        console.log('✅ [useDatabaseInitialization] Base de données initialisée avec succès');

      } catch (error) {
        console.error('❌ [useDatabaseInitialization] Erreur initialisation BDD:', error);
        console.warn('⚠️ [useDatabaseInitialization] L\'application continue sans optimisation spécifique');

        // Marquer comme initialisé même en cas d'erreur pour ne pas réessayer
        initializationDone.current = true;
      }
    };

    // Lancer l'initialisation en arrière-plan pour ne pas bloquer le démarrage
    const timer = setTimeout(initializeDatabase, 2000); // Un peu plus tard pour être sûr

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return {
    isInitialized: initializationDone.current,
  };
};