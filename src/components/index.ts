/**
 * Export centralisé des composants UI
 * Facilite les imports dans GlobalVideoPlayer et autres composants
 */

export { PiPControls } from './PiPControls';
export { TiviMateControls } from './TiviMateControls';
export { SettingsMenu } from './SettingsMenu';
export { DockerBar } from './DockerBar';
export { CastButton } from './CastButton';

// Types réexportés pour faciliter les imports
export type {
  VideoTrack,
  AudioTrack,
  SubtitleTrack,
  SubMenuType,
} from './SettingsMenu';
