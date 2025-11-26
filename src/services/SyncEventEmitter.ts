/**
 * 🔔 SyncEventEmitter - EventEmitter pour communication Service → UI
 * Permet au AutoSyncService d'envoyer des updates en temps réel à l'UI
 */

import { EventEmitter } from 'events';

// Types d'événements
export interface SyncStatusEvent {
  isActive: boolean;
  message: string;
  progress?: number;  // 0-100
  type?: 'playlist' | 'epg';
  timestamp: number;
}

export interface SyncErrorEvent {
  error: string;
  timestamp: number;
}

export interface SyncCompleteEvent {
  success: boolean;
  duration: number;
  timestamp: number;
}

export interface PlaylistUpdatedEvent {
  playlistId: string;
  playlistName: string;
  channelsCount: number;
  categoriesCount: number;
  timestamp: number;
}

// EventEmitter typé
class TypedEventEmitter extends EventEmitter {
  emit(event: 'syncStatus', data: SyncStatusEvent): boolean;
  emit(event: 'syncError', data: SyncErrorEvent): boolean;
  emit(event: 'syncComplete', data: SyncCompleteEvent): boolean;
  emit(event: 'playlistUpdated', data: PlaylistUpdatedEvent): boolean;
  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: 'syncStatus', listener: (data: SyncStatusEvent) => void): this;
  on(event: 'syncError', listener: (data: SyncErrorEvent) => void): this;
  on(event: 'syncComplete', listener: (data: SyncCompleteEvent) => void): this;
  on(event: 'playlistUpdated', listener: (data: PlaylistUpdatedEvent) => void): this;
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  off(event: 'syncStatus', listener: (data: SyncStatusEvent) => void): this;
  off(event: 'syncError', listener: (data: SyncErrorEvent) => void): this;
  off(event: 'syncComplete', listener: (data: SyncCompleteEvent) => void): this;
  off(event: 'playlistUpdated', listener: (data: PlaylistUpdatedEvent) => void): this;
  off(event: string, listener: (...args: any[]) => void): this {
    return super.off(event, listener);
  }
}

// Singleton
class SyncEventEmitterService {
  private emitter = new TypedEventEmitter();

  // ===== EMIT EVENTS =====

  emitSyncStatus(data: SyncStatusEvent): void {
    this.emitter.emit('syncStatus', data);
  }

  emitSyncError(error: string): void {
    this.emitter.emit('syncError', {
      error,
      timestamp: Date.now(),
    });
  }

  emitSyncComplete(success: boolean, duration: number): void {
    this.emitter.emit('syncComplete', {
      success,
      duration,
      timestamp: Date.now(),
    });
  }

  emitPlaylistUpdated(data: Omit<PlaylistUpdatedEvent, 'timestamp'>): void {
    this.emitter.emit('playlistUpdated', {
      ...data,
      timestamp: Date.now(),
    });
  }

  // ===== SUBSCRIBE =====

  onSyncStatus(listener: (data: SyncStatusEvent) => void): () => void {
    this.emitter.on('syncStatus', listener);

    // Retourner fonction de nettoyage
    return () => {
      this.emitter.off('syncStatus', listener);
    };
  }

  onSyncError(listener: (data: SyncErrorEvent) => void): () => void {
    this.emitter.on('syncError', listener);

    return () => {
      this.emitter.off('syncError', listener);
    };
  }

  onSyncComplete(listener: (data: SyncCompleteEvent) => void): () => void {
    this.emitter.on('syncComplete', listener);

    return () => {
      this.emitter.off('syncComplete', listener);
    };
  }

  onPlaylistUpdated(listener: (data: PlaylistUpdatedEvent) => void): () => void {
    this.emitter.on('playlistUpdated', listener);

    return () => {
      this.emitter.off('playlistUpdated', listener);
    };
  }

  // ===== CLEANUP =====

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

// Export singleton
export const syncEventEmitter = new SyncEventEmitterService();
export default syncEventEmitter;
