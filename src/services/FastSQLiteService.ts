/**
 * ⚡ Fast SQLite Service - Architecture style TiviMate
 * SQLite natif direct pour performances maximales avec 129K+ films
 */

import { openDatabase } from 'react-native-sqlite-storage';
import type {VodMovie, VodSeries, VodCategory} from '../types';

// Database name
const DB_NAME = 'iptv_fast.db';

// Enable debug en développement
const DEBUG_SQL = __DEV__;

export class FastSQLiteService {
  private static instance: FastSQLiteService;
  private db: any;

  private constructor() {
    try {
      this.db = openDatabase({
        name: DB_NAME,
        location: 'default',
      });
      console.log('✅ [FastSQLiteService] Base de données ouverte avec succès');
    } catch (error) {
      console.error('❌ [FastSQLiteService] Erreur ouverture base:', error);
      throw error;
    }
  }

  static getInstance(): FastSQLiteService {
    if (!FastSQLiteService.instance) {
      FastSQLiteService.instance = new FastSQLiteService();
    }
    return FastSQLiteService.instance;
  }

  /**
   * 🚀 Initialiser la base avec tables optimisées
   */
  async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔧 [FastSQLiteService] Début initialisation...');

      // 🚀 PRAGMA optimisations ULTRA-RAPIDES pour insertions massives
      this.db.executeSql('PRAGMA journal_mode = MEMORY'); // Journal en RAM (très rapide)
      this.db.executeSql('PRAGMA synchronous = OFF'); // Pas d'attente disque
      this.db.executeSql('PRAGMA cache_size = -128000'); // 128MB cache
      this.db.executeSql('PRAGMA temp_store = MEMORY');
      this.db.executeSql('PRAGMA mmap_size = 268435456'); // 256MB mmap
      this.db.executeSql('PRAGMA locking_mode = EXCLUSIVE'); // Lock exclusif

      this.db.transaction(tx => {
        console.log('📝 [FastSQLiteService] Début transaction...');

        // Table des catégories (optimisée)
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS vod_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id TEXT NOT NULL,
            category_id TEXT NOT NULL,
            category_name TEXT NOT NULL,
            category_type TEXT NOT NULL, -- 'movie' | 'series'
            parent_id INTEGER DEFAULT 0,
            movies_count INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(playlist_id, category_id)
          )
        `);

        // Table des films (optimisée pour 129K+ records)
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS vod_movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id TEXT NOT NULL,
            movie_id TEXT NOT NULL,
            category_id TEXT NOT NULL,
            name TEXT NOT NULL,
            stream_url TEXT NOT NULL,
            cover_url TEXT,
            backdrop_url TEXT,
            rating TEXT,
            duration TEXT,
            genre TEXT,
            release_date TEXT,
            plot TEXT,
            director TEXT,
            cast TEXT,
            added TEXT,
            container_extension TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          )
        `);

        // Migration: Ajouter backdrop_url si la colonne n'existe pas
        tx.executeSql(`
          PRAGMA table_info(vod_movies)
        `, [], (_, result) => {
          const columns = [];
          for (let i = 0; i < result.rows.length; i++) {
            columns.push(result.rows.item(i).name);
          }
          if (!columns.includes('backdrop_url')) {
            tx.executeSql(`
              ALTER TABLE vod_movies ADD COLUMN backdrop_url TEXT
            `, [], () => {
              console.log('✅ Colonne backdrop_url ajoutée à vod_movies');
            });
          }
        });

        // Table des séries (optimisée)
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS vod_series (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id TEXT NOT NULL,
            series_id TEXT NOT NULL,
            category_id TEXT NOT NULL,
            name TEXT NOT NULL,
            cover_url TEXT,
            backdrop_url TEXT,
            rating TEXT,
            genre TEXT,
            release_date TEXT,
            plot TEXT,
            director TEXT,
            cast TEXT,
            episodes_count INTEGER DEFAULT 0,
            seasons_count INTEGER DEFAULT 0,
            added TEXT,
            last_updated TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          )
        `);

        // 🚀 TRIGGER pour compteurs automatiques (instantané !)
        tx.executeSql(`
          CREATE TRIGGER IF NOT EXISTS update_category_movie_count
          AFTER INSERT ON vod_movies
          BEGIN
            UPDATE vod_categories
            SET movies_count = movies_count + 1,
                updated_at = strftime('%s', 'now')
            WHERE playlist_id = NEW.playlist_id AND category_id = NEW.category_id;
          END
        `);

        tx.executeSql(`
          CREATE TRIGGER IF NOT EXISTS delete_category_movie_count
          AFTER DELETE ON vod_movies
          BEGIN
            UPDATE vod_categories
            SET movies_count = movies_count - 1,
                updated_at = strftime('%s', 'now')
            WHERE playlist_id = OLD.playlist_id AND category_id = OLD.category_id;
          END
        `);

        tx.executeSql(`
          CREATE TRIGGER IF NOT EXISTS update_category_movie_count_on_category_change
          AFTER UPDATE OF category_id ON vod_movies
          WHEN OLD.category_id != NEW.category_id
          BEGIN
            UPDATE vod_categories
            SET movies_count = movies_count - 1,
                updated_at = strftime('%s', 'now')
            WHERE playlist_id = OLD.playlist_id AND category_id = OLD.category_id;

            UPDATE vod_categories
            SET movies_count = movies_count + 1,
                updated_at = strftime('%s', 'now')
            WHERE playlist_id = NEW.playlist_id AND category_id = NEW.category_id;
          END
        `);

        // 🚀 TRIGGERS pour compteurs séries automatiques
        tx.executeSql(`
          CREATE TRIGGER IF NOT EXISTS update_category_series_count
          AFTER INSERT ON vod_series
          BEGIN
            UPDATE vod_categories
            SET movies_count = movies_count + 1,
                updated_at = strftime('%s', 'now')
            WHERE playlist_id = NEW.playlist_id AND category_id = NEW.category_id;
          END
        `);

        tx.executeSql(`
          CREATE TRIGGER IF NOT EXISTS delete_category_series_count
          AFTER DELETE ON vod_series
          BEGIN
            UPDATE vod_categories
            SET movies_count = movies_count - 1,
                updated_at = strftime('%s', 'now')
            WHERE playlist_id = OLD.playlist_id AND category_id = OLD.category_id;
          END
        `);

        // 🚀 INDEX pour performances optimales
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_vod_movies_playlist_id ON vod_movies(playlist_id)`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_vod_movies_category_id ON vod_movies(category_id)`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_vod_movies_playlist_category ON vod_movies(playlist_id, category_id)`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_vod_movies_name ON vod_movies(name)`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_vod_categories_playlist_id ON vod_categories(playlist_id)`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_vod_series_playlist_category ON vod_series(playlist_id, category_id)`);

      }, (error) => {
        console.error('❌ Erreur initialisation Fast SQLite:', error?.message || error);
        console.error('❌ Détail erreur SQL:', JSON.stringify(error, null, 2));
        reject(error);
      }, () => {
        console.log('⚡ Fast SQLite initialisé avec succès');
        resolve();
      });
    });
  }

  /**
   * ⚡ Insérer les catégories avec compteurs automatiques
   * CORRECTION: Ne supprime que les catégories du type concerné (movie ou series)
   */
  async insertCategories(playlistId: string, categories: VodCategory[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // Sécurité : si la liste est vide, on ne fait rien
      if (!categories || categories.length === 0) {
        resolve();
        return;
      }

      // Détecter le type (movie ou series) depuis le premier élément
      const categoryType = categories[0].type;

      this.db.transaction(tx => {
        // 🛑 BUG FIX: On ne supprime QUE les catégories du type qu'on est en train d'insérer
        tx.executeSql(
          'DELETE FROM vod_categories WHERE playlist_id = ? AND category_type = ?',
          [playlistId, categoryType]
        );

        // Insérer nouvelles catégories
        categories.forEach(cat => {
          tx.executeSql(`
            INSERT OR REPLACE INTO vod_categories
            (playlist_id, category_id, category_name, category_type, parent_id, movies_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            playlistId,
            String(cat.category_id),
            cat.category_name,
            cat.type,
            cat.parent_id || 0,
            cat.count || 0,
            Date.now(),
            Date.now()
          ]);
        });

      }, (error) => {
        console.error('❌ Erreur insertion catégories:', error?.message || error);
        reject(error);
      }, () => {
        console.log(`✅ ${categories.length} catégories (${categoryType}) insérées pour ${playlistId}`);
        resolve();
      });
    });
  }

  /**
   * ⚡ Insérer les films avec INSERT multi-valeurs (ULTRA RAPIDE)
   * Utilise des batches de 500 lignes par INSERT pour performance maximale
   * Désactive triggers et index pendant l'import pour gain de 50%+
   */
  async insertMovies(playlistId: string, movies: VodMovie[]): Promise<void> {
    if (movies.length === 0) return;

    const startTime = Date.now();
    const now = Date.now();

    // 🚀 Prétraiter les données AVANT la transaction (évite conversions dans la boucle)
    console.log(`⚡ [FastSQLite] Préparation de ${movies.length} films...`);
    const preparedMovies = movies.map(movie => [
      playlistId,
      movie.movie_id?.toString() || '',
      movie.category_id?.toString() || '',
      movie.name || '',
      movie.stream_url || '',
      movie.cover_url || '',
      movie.backdrop_url || '',
      movie.rating || '',
      movie.duration || '',
      movie.genre || '',
      movie.release_date || '',
      movie.plot || '',
      movie.director || '',
      movie.cast || '',
      movie.added || '',
      movie.container_extension || '',
      now,
      now
    ]);

    // PRAGMA déjà configurés à l'init - insertion directe
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // 🚀 ÉTAPE 2: Supprimer les triggers (recalcul manuel plus rapide)
        tx.executeSql('DROP TRIGGER IF EXISTS update_category_movie_count');
        tx.executeSql('DROP TRIGGER IF EXISTS delete_category_movie_count');
        tx.executeSql('DROP TRIGGER IF EXISTS update_category_movie_count_on_category_change');

        // 🚀 Désactiver les index pour insertions plus rapides
        tx.executeSql('DROP INDEX IF EXISTS idx_vod_movies_playlist_id');
        tx.executeSql('DROP INDEX IF EXISTS idx_vod_movies_category_id');
        tx.executeSql('DROP INDEX IF EXISTS idx_vod_movies_playlist_category');
        tx.executeSql('DROP INDEX IF EXISTS idx_vod_movies_name');

        // Vider anciens films
        tx.executeSql('DELETE FROM vod_movies WHERE playlist_id = ?', [playlistId]);

        // 🚀 INSERT multi-valeurs: 1500 lignes par requête (25.5K params)
        const BATCH_SIZE = 1500;

        for (let i = 0; i < preparedMovies.length; i += BATCH_SIZE) {
          const batch = preparedMovies.slice(i, i + BATCH_SIZE);

          // Construire INSERT multi-valeurs (18 colonnes avec backdrop_url)
          const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
          const values: any[] = [];

          batch.forEach(movieData => {
            values.push(...movieData);
          });

          tx.executeSql(`
            INSERT INTO vod_movies
            (playlist_id, movie_id, category_id, name, stream_url, cover_url, backdrop_url, rating,
             duration, genre, release_date, plot, director, "cast", added, container_extension,
             created_at, updated_at)
            VALUES ${placeholders}
          `, values);
        }

        // 🚀 Recréer index composite unique (plus efficace que 4 index séparés)
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_vod_movies_playlist_category ON vod_movies(playlist_id, category_id)');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_vod_movies_name ON vod_movies(name)');

        // 🚀 Recalculer compteurs en une seule requête
        tx.executeSql(`
          UPDATE vod_categories
          SET movies_count = (
            SELECT COUNT(*) FROM vod_movies
            WHERE vod_movies.playlist_id = vod_categories.playlist_id
            AND vod_movies.category_id = vod_categories.category_id
          ),
          updated_at = ?
          WHERE playlist_id = ? AND category_type = 'movie'
        `, [now, playlistId]);

        // 🚀 Triggers supprimés définitivement - recalcul manuel plus performant

      }, (error) => {
        console.error('❌ Erreur insertion films:', error?.message || error);
        reject(error);
      }, () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`⚡ ${movies.length} films insérés en ${duration}s (SQLite optimisé)`);
        resolve();
      });
    });
  }

  /**
   * ⚡ Obtenir les catégories avec compteurs INSTANTANÉS (grâce aux triggers)
   */
  async getCategoriesWithCounts(playlistId: string, type: 'movie' | 'series'): Promise<VodCategory[]> {
    return new Promise((resolve, reject) => {
      console.log(`🔍 [FastSQLite] getCategoriesWithCounts: playlistId=${playlistId}, type=${type}`);
      this.db.transaction(tx => {
        tx.executeSql(`
          SELECT
            category_id,
            category_name,
            parent_id,
            category_type,
            COALESCE(movies_count, 0) as count
          FROM vod_categories
          WHERE playlist_id = ? AND category_type = ?
          ORDER BY
            CASE
              WHEN category_name LIKE 'FR|%' OR category_name LIKE 'EN|%' OR category_name LIKE 'ES|%' THEN 0
              WHEN category_name LIKE 'DE|%' OR category_name LIKE 'IT|%' OR category_name LIKE 'PT|%' THEN 1
              WHEN category_name GLOB '[A-Za-z]*' THEN 2
              ELSE 3
            END,
            category_name COLLATE NOCASE
        `, [playlistId, type], (_, results) => {
          const categories: VodCategory[] = [];
          for (let i = 0; i < results.rows.length; i++) {
            const row = results.rows.item(i);
            categories.push({
              id: row.category_id,
              category_id: row.category_id,
              category_name: row.category_name,
              parent_id: row.parent_id,
              type: row.category_type,
              count: row.count
            });
          }
          console.log(`✅ [FastSQLite] ${categories.length} catégories trouvées`);
          resolve(categories);
        }, (_, error) => {
          console.error('❌ [FastSQLite] Erreur getCategoriesWithCounts:', error);
          reject(error);
          return false;
        });
      }, (error) => {
        console.error('❌ [FastSQLite] Transaction error:', error);
        reject(error);
      });
    });
  }

  /**
   * ⚡ Obtenir les films d'une catégorie avec PAGINATION (20 films)
   */
  async getMoviesPaginated(
    playlistId: string,
    categoryId: string,
    page: number = 0,
    pageSize: number = 20
  ): Promise<{movies: VodMovie[], hasMore: boolean, totalCount: number}> {
    return new Promise((resolve, reject) => {
      const offset = page * pageSize;
      console.log(`🔍 [FastSQLite] getMoviesPaginated: categoryId=${categoryId}, page=${page}`);

      this.db.transaction(tx => {
        // Compter le total
        tx.executeSql(`
          SELECT COUNT(*) as total FROM vod_movies
          WHERE playlist_id = ? AND category_id = ?
        `, [playlistId, categoryId], (_, countResult) => {
          const totalCount = countResult.rows.item(0).total;
          console.log(`📊 [FastSQLite] Total films dans catégorie: ${totalCount}`);

          // Paginer les résultats - Tri ASCII pour mettre A-Z en premier
          tx.executeSql(`
            SELECT
              id, movie_id, category_id, name, stream_url, cover_url, backdrop_url, rating,
              duration, genre, release_date, plot, director, "cast", added, container_extension
            FROM vod_movies
            WHERE playlist_id = ? AND category_id = ?
            ORDER BY
              CASE WHEN name GLOB '[A-Za-z]*' THEN 0 ELSE 1 END,
              name COLLATE NOCASE
            LIMIT ? OFFSET ?
          `, [playlistId, categoryId, pageSize, offset], (_, movieResults) => {
            const movies: VodMovie[] = [];
            for (let i = 0; i < movieResults.rows.length; i++) {
              const row = movieResults.rows.item(i);
              movies.push({
                id: row.id.toString(),
                movie_id: row.movie_id,
                category_id: row.category_id,
                name: row.name,
                stream_url: row.stream_url,
                cover_url: row.cover_url,
                backdrop_url: row.backdrop_url || '',
                rating: row.rating,
                duration: row.duration,
                genre: row.genre,
                release_date: row.release_date,
                plot: row.plot,
                director: row.director,
                cast: row.cast,
                added: row.added,
                container_extension: row.container_extension,
                category_name: '',
                imdb_id: '',
                youtube_trailer: ''
              });
            }

            const hasMore = (offset + movieResults.rows.length) < totalCount;
            console.log(`✅ [FastSQLite] ${movies.length} films chargés (hasMore: ${hasMore})`);

            resolve({
              movies,
              hasMore,
              totalCount
            });
          }, (_, error) => {
            console.error('❌ [FastSQLite] Erreur SELECT movies:', error);
            reject(error);
            return false;
          });
        }, (_, error) => {
          console.error('❌ [FastSQLite] Erreur COUNT movies:', error);
          reject(error);
          return false;
        });
      }, (error) => {
        console.error('❌ [FastSQLite] Transaction error getMoviesPaginated:', error);
        reject(error);
      });
    });
  }

  /**
   * ⚡ Obtenir TOUS les films avec PAGINATION (catégorie "Tout")
   */
  async getAllMoviesPaginated(
    playlistId: string,
    page: number = 0,
    pageSize: number = 20
  ): Promise<{movies: VodMovie[], hasMore: boolean, totalCount: number}> {
    return new Promise((resolve, reject) => {
      const offset = page * pageSize;
      console.log(`🔍 [FastSQLite] getAllMoviesPaginated: page=${page}`);

      this.db.transaction(tx => {
        // Compter le total
        tx.executeSql(`
          SELECT COUNT(*) as total FROM vod_movies
          WHERE playlist_id = ?
        `, [playlistId], (_, countResult) => {
          const totalCount = countResult.rows.item(0).total;
          console.log(`📊 [FastSQLite] Total films: ${totalCount}`);

          // Paginer les résultats - Tri ASCII pour mettre A-Z en premier
          tx.executeSql(`
            SELECT
              id, movie_id, category_id, name, stream_url, cover_url, backdrop_url, rating,
              duration, genre, release_date, plot, director, "cast", added, container_extension
            FROM vod_movies
            WHERE playlist_id = ?
            ORDER BY
              CASE WHEN name GLOB '[A-Za-z]*' THEN 0 ELSE 1 END,
              name COLLATE NOCASE
            LIMIT ? OFFSET ?
          `, [playlistId, pageSize, offset], (_, movieResults) => {
            const movies: VodMovie[] = [];
            for (let i = 0; i < movieResults.rows.length; i++) {
              const row = movieResults.rows.item(i);
              movies.push({
                id: row.id.toString(),
                movie_id: row.movie_id,
                category_id: row.category_id,
                name: row.name,
                stream_url: row.stream_url,
                cover_url: row.cover_url,
                backdrop_url: row.backdrop_url || '',
                rating: row.rating,
                duration: row.duration,
                genre: row.genre,
                release_date: row.release_date,
                plot: row.plot,
                director: row.director,
                cast: row.cast,
                added: row.added,
                container_extension: row.container_extension,
                category_name: '',
                imdb_id: '',
                youtube_trailer: ''
              });
            }

            const hasMore = (offset + movieResults.rows.length) < totalCount;
            console.log(`✅ [FastSQLite] ${movies.length} films chargés (hasMore: ${hasMore})`);

            resolve({
              movies,
              hasMore,
              totalCount
            });
          }, (_, error) => {
            console.error('❌ [FastSQLite] Erreur SELECT all movies:', error);
            reject(error);
            return false;
          });
        }, (_, error) => {
          console.error('❌ [FastSQLite] Erreur COUNT all movies:', error);
          reject(error);
          return false;
        });
      }, (error) => {
        console.error('❌ [FastSQLite] Transaction error getAllMoviesPaginated:', error);
        reject(error);
      });
    });
  }

  /**
   * ⚡ Obtenir les films récemment ajoutés avec PAGINATION
   */
  async getRecentlyAddedMovies(
    playlistId: string,
    page: number = 0,
    pageSize: number = 20
  ): Promise<{movies: VodMovie[], hasMore: boolean, totalCount: number}> {
    return new Promise((resolve, reject) => {
      const offset = page * pageSize;
      console.log(`🔍 [FastSQLite] getRecentlyAddedMovies: page=${page}`);

      // Limiter à 50 films les plus récents
      const maxRecentMovies = 50;

      this.db.transaction(tx => {
        // Sélectionner les films récents, triés par date d'ajout
        // On va dédupliquer en JS car SQLite ne peut pas facilement extraire le nom de base
        tx.executeSql(`
          SELECT
            id, movie_id, category_id, name, stream_url, cover_url, backdrop_url, rating,
            duration, genre, release_date, plot, director, "cast", added, container_extension
          FROM vod_movies
          WHERE playlist_id = ?
          ORDER BY added DESC, created_at DESC
          LIMIT 500
        `, [playlistId], (_, movieResults) => {
            // Fonction pour extraire le nom de base (sans préfixes langue/qualité)
            const getBaseName = (name: string): string => {
              // Supprimer les préfixes comme "ALB|", "DE|", "EN|", "FR|", etc.
              let baseName = name.replace(/^[A-Z]{2,3}\|\s*/i, '');
              // Supprimer les suffixes comme "[MULTI-SUB]", "4K", "HD", etc.
              baseName = baseName.replace(/\s*\[.*?\]\s*/g, '');
              baseName = baseName.replace(/\s*(4K|HD|SD|UHD|MULTI-SUB|MULTI|VF|VOSTFR|VO)\s*/gi, '');
              return baseName.trim().toLowerCase();
            };

            // Dédupliquer par nom de base
            const seenBaseNames = new Set<string>();
            const allMovies: VodMovie[] = [];

            for (let i = 0; i < movieResults.rows.length; i++) {
              const row = movieResults.rows.item(i);
              const baseName = getBaseName(row.name);

              if (!seenBaseNames.has(baseName)) {
                seenBaseNames.add(baseName);
                allMovies.push({
                  id: row.id.toString(),
                  movie_id: row.movie_id,
                  category_id: row.category_id,
                  name: row.name,
                  stream_url: row.stream_url,
                  cover_url: row.cover_url,
                  backdrop_url: row.backdrop_url || '',
                  rating: row.rating,
                  duration: row.duration,
                  genre: row.genre,
                  release_date: row.release_date,
                  plot: row.plot,
                  director: row.director,
                  cast: row.cast,
                  added: row.added,
                  container_extension: row.container_extension,
                  category_name: '',
                  backdrop_url: '',
                  imdb_id: '',
                  youtube_trailer: ''
                });
              }
            }

            // Limiter à maxRecentMovies et paginer
            const totalCount = Math.min(allMovies.length, maxRecentMovies);
            const paginatedMovies = allMovies.slice(offset, offset + pageSize);
            const hasMore = (offset + paginatedMovies.length) < totalCount;

            console.log(`✅ [FastSQLite] ${paginatedMovies.length} films récents uniques chargés (total: ${totalCount})`);

            resolve({
              movies: paginatedMovies,
              hasMore,
              totalCount
            });
          }, (_, error) => {
            console.error('❌ [FastSQLite] Erreur SELECT recent movies:', error);
            reject(error);
            return false;
          });
      }, (error) => {
        console.error('❌ [FastSQLite] Transaction error getRecentlyAddedMovies:', error);
        reject(error);
      });
    });
  }

  /**
   * 🔍 Recherche rapide dans les films (avec filtre optionnel par catégorie)
   */
  async searchMovies(playlistId: string, query: string, limit: number = 20, categoryId?: string): Promise<VodMovie[]> {
    console.log(`🔍 [FastSQLite] searchMovies: playlistId=${playlistId}, query="${query}", limit=${limit}, categoryId=${categoryId || 'all'}`);
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Construire la requête selon si on filtre par catégorie ou non
        const hasCategory = categoryId && categoryId !== 'all' && categoryId !== 'recent';
        const sql = hasCategory
          ? `
            SELECT
              id, movie_id, category_id, name, stream_url, cover_url, backdrop_url, rating,
              duration, genre, release_date, plot, director, "cast", added, container_extension
            FROM vod_movies
            WHERE playlist_id = ? AND category_id = ? AND name LIKE ?
            ORDER BY name COLLATE NOCASE
            LIMIT ?
          `
          : `
            SELECT
              id, movie_id, category_id, name, stream_url, cover_url, backdrop_url, rating,
              duration, genre, release_date, plot, director, "cast", added, container_extension
            FROM vod_movies
            WHERE playlist_id = ? AND name LIKE ?
            ORDER BY name COLLATE NOCASE
            LIMIT ?
          `;

        const params = hasCategory
          ? [playlistId, categoryId, `%${query}%`, limit]
          : [playlistId, `%${query}%`, limit];

        tx.executeSql(sql, params, (_, results) => {
          console.log(`✅ [FastSQLite] searchMovies: ${results.rows.length} résultats`);
          const movies: VodMovie[] = [];
          for (let i = 0; i < results.rows.length; i++) {
            const row = results.rows.item(i);
            movies.push({
              id: row.id.toString(),
              movie_id: row.movie_id,
              category_id: row.category_id,
              name: row.name,
              stream_url: row.stream_url,
              cover_url: row.cover_url,
              backdrop_url: row.backdrop_url || '',
              rating: row.rating,
              duration: row.duration,
              genre: row.genre,
              release_date: row.release_date,
              plot: row.plot,
              director: row.director,
              cast: row.cast,
              added: row.added,
              container_extension: row.container_extension,
              category_name: '',
              imdb_id: '',
              youtube_trailer: ''
            });
          }
          resolve(movies);
        }, (_, error) => {
          console.error('❌ [FastSQLite] Erreur searchMovies:', error);
          reject(error);
          return false;
        });
      }, (error) => {
        console.error('❌ [FastSQLite] Transaction error searchMovies:', error);
        reject(error);
      });
    });
  }

  /**
   * ⚡ Insérer les séries avec INSERT multi-valeurs (ULTRA RAPIDE)
   * Utilise des batches de 500 lignes par INSERT pour performance maximale
   * Désactive triggers et index pendant l'import pour gain de 50%+
   */
  async insertSeries(playlistId: string, series: VodSeries[]): Promise<void> {
    if (series.length === 0) return;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const now = Date.now();

      // 🚀 Prétraiter les données AVANT la transaction
      console.log(`⚡ [FastSQLite] Préparation de ${series.length} séries...`);
      const preparedSeries = series.map(s => [
        playlistId,
        String(s.series_id || s.stream_id || ''),
        String(s.category_id || ''),
        s.name || '',
        s.cover_url || '',
        s.backdrop_url || '',
        s.rating || '',
        s.genre || '',
        s.release_date || '',
        s.plot || '',
        s.director || '',
        s.cast || '',
        s.episodes_count || 0,
        s.seasons_count || 0,
        s.added || '',
        s.last_updated || '',
        now,
        now
      ]);

      this.db.transaction(tx => {
        // 🚀 ÉTAPE 1: Désactiver les triggers
        console.log('🔧 [FastSQLite] Désactivation triggers séries...');
        tx.executeSql('DROP TRIGGER IF EXISTS update_category_series_count');
        tx.executeSql('DROP TRIGGER IF EXISTS delete_category_series_count');

        // 🚀 ÉTAPE 2: Désactiver les index pour insertions plus rapides
        console.log('🔧 [FastSQLite] Désactivation index séries...');
        tx.executeSql('DROP INDEX IF EXISTS idx_vod_series_playlist_category');
        tx.executeSql('DROP INDEX IF EXISTS idx_vod_series_playlist_id');
        tx.executeSql('DROP INDEX IF EXISTS idx_vod_series_name');

        // Vider anciennes séries
        tx.executeSql('DELETE FROM vod_series WHERE playlist_id = ?', [playlistId]);

        // 🚀 INSERT multi-valeurs: 500 lignes par requête
        const BATCH_SIZE = 500;
        console.log(`⚡ [FastSQLite] Insertion séries par batches de ${BATCH_SIZE}...`);

        for (let i = 0; i < preparedSeries.length; i += BATCH_SIZE) {
          const batch = preparedSeries.slice(i, i + BATCH_SIZE);

          // Construire INSERT multi-valeurs (18 colonnes)
          const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
          const values: any[] = [];

          batch.forEach(seriesData => {
            values.push(...seriesData);
          });

          tx.executeSql(`
            INSERT INTO vod_series
            (playlist_id, series_id, category_id, name, cover_url, backdrop_url, rating,
             genre, release_date, plot, director, "cast", episodes_count, seasons_count, added, last_updated,
             created_at, updated_at)
            VALUES ${placeholders}
          `, values);
        }

        // 🚀 ÉTAPE 3: Recréer les index après insertion
        console.log('🔧 [FastSQLite] Recréation des index séries...');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_vod_series_playlist_category ON vod_series(playlist_id, category_id)');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_vod_series_playlist_id ON vod_series(playlist_id)');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_vod_series_name ON vod_series(name)');

        // 🚀 ÉTAPE 4: Recalculer tous les compteurs séries en une seule requête
        console.log('🔧 [FastSQLite] Recalcul des compteurs catégories séries...');
        tx.executeSql(`
          UPDATE vod_categories
          SET movies_count = (
            SELECT COUNT(*) FROM vod_series
            WHERE vod_series.playlist_id = vod_categories.playlist_id
            AND vod_series.category_id = vod_categories.category_id
          ),
          updated_at = ?
          WHERE playlist_id = ? AND category_type = 'series'
        `, [now, playlistId]);

        // 🚀 ÉTAPE 5: Recréer les triggers pour usage normal
        console.log('🔧 [FastSQLite] Recréation des triggers séries...');
        tx.executeSql(`
          CREATE TRIGGER IF NOT EXISTS update_category_series_count
          AFTER INSERT ON vod_series
          BEGIN
            UPDATE vod_categories
            SET movies_count = movies_count + 1,
                updated_at = strftime('%s', 'now')
            WHERE playlist_id = NEW.playlist_id AND category_id = NEW.category_id;
          END
        `);

        tx.executeSql(`
          CREATE TRIGGER IF NOT EXISTS delete_category_series_count
          AFTER DELETE ON vod_series
          BEGIN
            UPDATE vod_categories
            SET movies_count = movies_count - 1,
                updated_at = strftime('%s', 'now')
            WHERE playlist_id = OLD.playlist_id AND category_id = OLD.category_id;
          END
        `);

      }, (error) => {
        console.error('❌ Erreur insertion séries:', error?.message || error);
        reject(error);
      }, () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`⚡ ${series.length} séries insérées en ${duration}s (SQLite optimisé)`);
        resolve();
      });
    });
  }

  /**
   * ⚡ Obtenir les séries d'une catégorie avec PAGINATION
   */
  async getSeriesPaginated(
    playlistId: string,
    categoryId: string,
    page: number = 0,
    pageSize: number = 20
  ): Promise<{series: VodSeries[], hasMore: boolean, totalCount: number}> {
    return new Promise((resolve, reject) => {
      const offset = page * pageSize;
      console.log(`🔍 [FastSQLite] getSeriesPaginated: categoryId=${categoryId}, page=${page}`);

      this.db.transaction(tx => {
        // Compter le total
        tx.executeSql(`
          SELECT COUNT(*) as total FROM vod_series
          WHERE playlist_id = ? AND category_id = ?
        `, [playlistId, categoryId], (_, countResult) => {
          const totalCount = countResult.rows.item(0).total;
          console.log(`📊 [FastSQLite] Total séries dans catégorie: ${totalCount}`);

          // Paginer les résultats - Tri ASCII pour mettre A-Z en premier
          tx.executeSql(`
            SELECT
              id, series_id, category_id, name, cover_url, backdrop_url, rating,
              genre, release_date, plot, director, "cast", episodes_count, seasons_count, added, last_updated
            FROM vod_series
            WHERE playlist_id = ? AND category_id = ?
            ORDER BY
              CASE WHEN name GLOB '[A-Za-z]*' THEN 0 ELSE 1 END,
              name COLLATE NOCASE
            LIMIT ? OFFSET ?
          `, [playlistId, categoryId, pageSize, offset], (_, seriesResults) => {
            const series: VodSeries[] = [];
            for (let i = 0; i < seriesResults.rows.length; i++) {
              const row = seriesResults.rows.item(i);
              series.push({
                id: row.id.toString(),
                series_id: row.series_id,
                stream_id: row.series_id,
                category_id: row.category_id,
                name: row.name,
                cover_url: row.cover_url,
                backdrop_url: row.backdrop_url,
                rating: row.rating,
                genre: row.genre,
                release_date: row.release_date,
                plot: row.plot,
                director: row.director,
                cast: row.cast,
                episodes_count: row.episodes_count,
                seasons_count: row.seasons_count,
                added: row.added,
                last_updated: row.last_updated,
                category_name: '',
                imdb_id: '',
                youtube_trailer: ''
              });
            }

            const hasMore = (offset + seriesResults.rows.length) < totalCount;
            console.log(`✅ [FastSQLite] ${series.length} séries chargées (hasMore: ${hasMore})`);

            resolve({
              series,
              hasMore,
              totalCount
            });
          }, (_, error) => {
            console.error('❌ [FastSQLite] Erreur SELECT series:', error);
            reject(error);
            return false;
          });
        }, (_, error) => {
          console.error('❌ [FastSQLite] Erreur COUNT series:', error);
          reject(error);
          return false;
        });
      }, (error) => {
        console.error('❌ [FastSQLite] Transaction error getSeriesPaginated:', error);
        reject(error);
      });
    });
  }

  /**
   * ⚡ Obtenir TOUTES les séries avec PAGINATION (catégorie "Tout")
   */
  async getAllSeriesPaginated(
    playlistId: string,
    page: number = 0,
    pageSize: number = 20
  ): Promise<{series: VodSeries[], hasMore: boolean, totalCount: number}> {
    return new Promise((resolve, reject) => {
      const offset = page * pageSize;
      console.log(`🔍 [FastSQLite] getAllSeriesPaginated: page=${page}`);

      this.db.transaction(tx => {
        // Compter le total
        tx.executeSql(`
          SELECT COUNT(*) as total FROM vod_series
          WHERE playlist_id = ?
        `, [playlistId], (_, countResult) => {
          const totalCount = countResult.rows.item(0).total;
          console.log(`📊 [FastSQLite] Total séries: ${totalCount}`);

          // Paginer les résultats - Tri ASCII pour mettre A-Z en premier
          tx.executeSql(`
            SELECT
              id, series_id, category_id, name, cover_url, backdrop_url, rating,
              genre, release_date, plot, director, "cast", episodes_count, seasons_count, added, last_updated
            FROM vod_series
            WHERE playlist_id = ?
            ORDER BY
              CASE WHEN name GLOB '[A-Za-z]*' THEN 0 ELSE 1 END,
              name COLLATE NOCASE
            LIMIT ? OFFSET ?
          `, [playlistId, pageSize, offset], (_, seriesResults) => {
            const series: VodSeries[] = [];
            for (let i = 0; i < seriesResults.rows.length; i++) {
              const row = seriesResults.rows.item(i);
              series.push({
                id: row.id.toString(),
                series_id: row.series_id,
                stream_id: row.series_id,
                category_id: row.category_id,
                name: row.name,
                cover_url: row.cover_url,
                backdrop_url: row.backdrop_url,
                rating: row.rating,
                genre: row.genre,
                release_date: row.release_date,
                plot: row.plot,
                director: row.director,
                cast: row.cast,
                episodes_count: row.episodes_count,
                seasons_count: row.seasons_count,
                added: row.added,
                last_updated: row.last_updated,
                category_name: '',
                imdb_id: '',
                youtube_trailer: ''
              });
            }

            const hasMore = (offset + seriesResults.rows.length) < totalCount;
            console.log(`✅ [FastSQLite] ${series.length} séries chargées (hasMore: ${hasMore})`);

            resolve({
              series,
              hasMore,
              totalCount
            });
          }, (_, error) => {
            console.error('❌ [FastSQLite] Erreur SELECT all series:', error);
            reject(error);
            return false;
          });
        }, (_, error) => {
          console.error('❌ [FastSQLite] Erreur COUNT all series:', error);
          reject(error);
          return false;
        });
      }, (error) => {
        console.error('❌ [FastSQLite] Transaction error getAllSeriesPaginated:', error);
        reject(error);
      });
    });
  }

  /**
   * ⚡ Obtenir les séries récemment ajoutées avec PAGINATION
   */
  async getRecentlyAddedSeries(
    playlistId: string,
    page: number = 0,
    pageSize: number = 20
  ): Promise<{series: VodSeries[], hasMore: boolean, totalCount: number}> {
    return new Promise((resolve, reject) => {
      const offset = page * pageSize;
      console.log(`🔍 [FastSQLite] getRecentlyAddedSeries: page=${page}`);

      // Limiter à 50 séries les plus récentes
      const maxRecentSeries = 50;

      this.db.transaction(tx => {
        // Sélectionner les séries récentes, triées par date d'ajout
        // On va dédupliquer en JS car SQLite ne peut pas facilement extraire le nom de base
        tx.executeSql(`
          SELECT
            id, series_id, category_id, name, cover_url, backdrop_url, rating,
            genre, release_date, plot, director, "cast", episodes_count, seasons_count, added, last_updated
          FROM vod_series
          WHERE playlist_id = ?
          ORDER BY added DESC, created_at DESC
          LIMIT 500
        `, [playlistId], (_, seriesResults) => {
            // Fonction pour extraire le nom de base (sans préfixes langue/qualité)
            const getBaseName = (name: string): string => {
              // Supprimer les préfixes comme "ALB|", "DE|", "EN|", "FR|", etc.
              let baseName = name.replace(/^[A-Z]{2,3}\|\s*/i, '');
              // Supprimer les suffixes comme "[MULTI-SUB]", "4K", "HD", etc.
              baseName = baseName.replace(/\s*\[.*?\]\s*/g, '');
              baseName = baseName.replace(/\s*(4K|HD|SD|UHD|MULTI-SUB|MULTI|VF|VOSTFR|VO)\s*/gi, '');
              return baseName.trim().toLowerCase();
            };

            // Dédupliquer par nom de base
            const seenBaseNames = new Set<string>();
            const allSeries: VodSeries[] = [];

            for (let i = 0; i < seriesResults.rows.length; i++) {
              const row = seriesResults.rows.item(i);
              const baseName = getBaseName(row.name);

              if (!seenBaseNames.has(baseName)) {
                seenBaseNames.add(baseName);
                allSeries.push({
                  id: row.id.toString(),
                  series_id: row.series_id,
                  stream_id: row.series_id,
                  category_id: row.category_id,
                  name: row.name,
                  cover_url: row.cover_url,
                  backdrop_url: row.backdrop_url,
                  rating: row.rating,
                  genre: row.genre,
                  release_date: row.release_date,
                  plot: row.plot,
                  director: row.director,
                  cast: row.cast,
                  episodes_count: row.episodes_count,
                  seasons_count: row.seasons_count,
                  added: row.added,
                  last_updated: row.last_updated,
                  category_name: '',
                  imdb_id: '',
                  youtube_trailer: ''
                });
              }
            }

            // Limiter à maxRecentSeries et paginer
            const totalCount = Math.min(allSeries.length, maxRecentSeries);
            const paginatedSeries = allSeries.slice(offset, offset + pageSize);
            const hasMore = (offset + paginatedSeries.length) < totalCount;

            console.log(`✅ [FastSQLite] ${paginatedSeries.length} séries récentes uniques chargées (total: ${totalCount})`);

            resolve({
              series: paginatedSeries,
              hasMore,
              totalCount
            });
          }, (_, error) => {
            console.error('❌ [FastSQLite] Erreur SELECT recent series:', error);
            reject(error);
            return false;
          });
      }, (error) => {
        console.error('❌ [FastSQLite] Transaction error getRecentlyAddedSeries:', error);
        reject(error);
      });
    });
  }

  /**
   * 🔍 Recherche rapide dans les séries (avec filtre optionnel par catégorie)
   */
  async searchSeries(playlistId: string, query: string, limit: number = 20, categoryId?: string): Promise<VodSeries[]> {
    console.log(`🔍 [FastSQLite] searchSeries: playlistId=${playlistId}, query="${query}", limit=${limit}, categoryId=${categoryId || 'all'}`);
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Construire la requête selon si on filtre par catégorie ou non
        const hasCategory = categoryId && categoryId !== 'all' && categoryId !== 'recent';
        const sql = hasCategory
          ? `
            SELECT
              id, series_id, category_id, name, cover_url, backdrop_url, rating,
              genre, release_date, plot, director, "cast", episodes_count, seasons_count, added, last_updated
            FROM vod_series
            WHERE playlist_id = ? AND category_id = ? AND name LIKE ?
            ORDER BY name COLLATE NOCASE
            LIMIT ?
          `
          : `
            SELECT
              id, series_id, category_id, name, cover_url, backdrop_url, rating,
              genre, release_date, plot, director, "cast", episodes_count, seasons_count, added, last_updated
            FROM vod_series
            WHERE playlist_id = ? AND name LIKE ?
            ORDER BY name COLLATE NOCASE
            LIMIT ?
          `;

        const params = hasCategory
          ? [playlistId, categoryId, `%${query}%`, limit]
          : [playlistId, `%${query}%`, limit];

        tx.executeSql(sql, params, (_, results) => {
          console.log(`✅ [FastSQLite] searchSeries: ${results.rows.length} résultats`);
          const series: VodSeries[] = [];
          for (let i = 0; i < results.rows.length; i++) {
            const row = results.rows.item(i);
            series.push({
              id: row.id.toString(),
              series_id: row.series_id,
              stream_id: row.series_id,
              category_id: row.category_id,
              name: row.name,
              cover_url: row.cover_url,
              backdrop_url: row.backdrop_url,
              rating: row.rating,
              genre: row.genre,
              release_date: row.release_date,
              plot: row.plot,
              director: row.director,
              cast: row.cast,
              episodes_count: row.episodes_count,
              seasons_count: row.seasons_count,
              added: row.added,
              last_updated: row.last_updated,
              category_name: '',
              imdb_id: '',
              youtube_trailer: ''
            });
          }
          resolve(series);
        }, (_, error) => {
          console.error('❌ [FastSQLite] Erreur searchSeries:', error);
          reject(error);
          return false;
        });
      }, (error) => {
        console.error('❌ [FastSQLite] Transaction error searchSeries:', error);
        reject(error);
      });
    });
  }
}

export default FastSQLiteService.getInstance();