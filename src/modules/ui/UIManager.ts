import { Appearance, ColorSchemeName } from 'react-native';
import { StorageService } from '../../services/StorageService';

export interface Theme {
  name: string;
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    error: string;
    success: string;
    warning: string;
  };
}

export interface UIState {
  currentTheme: Theme;
  isDarkMode: boolean;
  showPlayerControls: boolean;
  isFullscreen: boolean;
  orientation: 'portrait' | 'landscape';
  activeModal: string | null;
  loading: boolean;
}

export class UIManager {
  private static instance: UIManager;
  private state: UIState;
  private themes: { [key: string]: Theme };
  private listeners: Array<(state: UIState) => void> = [];
  private storageService: StorageService;
  private controlsTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.storageService = StorageService.getInstance();
    this.themes = this.initializeThemes();
    
    const systemScheme = Appearance.getColorScheme();
    const isDark = systemScheme === 'dark';
    
    this.state = {
      currentTheme: this.themes[isDark ? 'dark' : 'light'],
      isDarkMode: isDark,
      showPlayerControls: true,
      isFullscreen: false,
      orientation: 'portrait',
      activeModal: null,
      loading: false,
    };

    this.initialize();
  }

  public static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      const settings = await this.storageService.getSettings();
      
      // Apply theme preference
      if (settings.theme === 'auto') {
        Appearance.addChangeListener(this.handleSystemThemeChange.bind(this));
      } else {
        this.setTheme(settings.theme === 'dark' ? 'dark' : 'light');
      }
      
      console.log('🎨 UIManager initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation UIManager:', error);
    }
  }

  private initializeThemes(): { [key: string]: Theme } {
    return {
      light: {
        name: 'Clair',
        isDark: false,
        colors: {
          primary: '#007AFF',
          secondary: '#5856D6',
          background: '#FFFFFF',
          surface: '#F2F2F7',
          text: '#000000',
          textSecondary: '#8E8E93',
          border: '#C6C6C8',
          accent: '#FF9500',
          error: '#FF3B30',
          success: '#34C759',
          warning: '#FF9500',
        },
      },
      dark: {
        name: 'Sombre',
        isDark: true,
        colors: {
          primary: '#0A84FF',
          secondary: '#5E5CE6',
          background: '#000000',
          surface: '#1C1C1E',
          text: '#FFFFFF',
          textSecondary: '#8E8E93',
          border: '#38383A',
          accent: '#FF9F0A',
          error: '#FF453A',
          success: '#30D158',
          warning: '#FF9F0A',
        },
      },
      blue: {
        name: 'Bleu',
        isDark: false,
        colors: {
          primary: '#007AFF',
          secondary: '#34C759',
          background: '#F0F8FF',
          surface: '#E6F3FF',
          text: '#1D1D1F',
          textSecondary: '#6E6E73',
          border: '#B3D9FF',
          accent: '#FF9500',
          error: '#FF3B30',
          success: '#34C759',
          warning: '#FF9500',
        },
      },
      red: {
        name: 'Rouge',
        isDark: true,
        colors: {
          primary: '#FF453A',
          secondary: '#FF9F0A',
          background: '#1A0A0A',
          surface: '#2D1B1B',
          text: '#FFFFFF',
          textSecondary: '#FF8A80',
          border: '#4D2626',
          accent: '#FFB74D',
          error: '#FF1744',
          success: '#4CAF50',
          warning: '#FF9800',
        },
      },
    };
  }

  // State management
  getState(): UIState {
    return { ...this.state };
  }

  getThemes(): { [key: string]: Theme } {
    return { ...this.themes };
  }

  getCurrentTheme(): Theme {
    return this.state.currentTheme;
  }

  subscribe(listener: (state: UIState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private setState(updates: Partial<UIState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Theme management
  setTheme(themeName: string): void {
    const theme = this.themes[themeName];
    if (theme) {
      console.log('🎨 Changement de thème:', theme.name);
      this.setState({
        currentTheme: theme,
        isDarkMode: theme.isDark,
      });

      // Save preference
      this.storageService.getSettings().then(settings => {
        settings.theme = theme.isDark ? 'dark' : 'light';
        this.storageService.saveSettings(settings);
      });
    }
  }

  toggleTheme(): void {
    const newTheme = this.state.isDarkMode ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  private handleSystemThemeChange(preferences: { colorScheme: ColorSchemeName }): void {
    const isDark = preferences.colorScheme === 'dark';
    this.setTheme(isDark ? 'dark' : 'light');
  }

  // Player controls
  showPlayerControls(): void {
    this.setState({ showPlayerControls: true });
    this.scheduleHideControls();
  }

  hidePlayerControls(): void {
    this.setState({ showPlayerControls: false });
  }

  togglePlayerControls(): void {
    if (this.state.showPlayerControls) {
      this.hidePlayerControls();
    } else {
      this.showPlayerControls();
    }
  }

  private scheduleHideControls(): void {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }

    this.controlsTimeout = setTimeout(() => {
      this.hidePlayerControls();
    }, 3000);
  }

  // Fullscreen
  setFullscreen(isFullscreen: boolean): void {
    console.log('📺 Fullscreen:', isFullscreen);
    this.setState({ isFullscreen });
  }

  toggleFullscreen(): void {
    this.setFullscreen(!this.state.isFullscreen);
  }

  // Orientation
  setOrientation(orientation: 'portrait' | 'landscape'): void {
    this.setState({ orientation });
  }

  // Modal management
  showModal(modalId: string): void {
    console.log('📱 Affichage modal:', modalId);
    this.setState({ activeModal: modalId });
  }

  hideModal(): void {
    if (this.state.activeModal) {
      console.log('❌ Fermeture modal:', this.state.activeModal);
      this.setState({ activeModal: null });
    }
  }

  isModalActive(modalId: string): boolean {
    return this.state.activeModal === modalId;
  }

  // Loading
  setLoading(loading: boolean): void {
    this.setState({ loading });
  }

  // Helper methods for components
  getStylesForTheme() {
    const { colors } = this.state.currentTheme;
    
    return {
      container: {
        backgroundColor: colors.background,
      },
      surface: {
        backgroundColor: colors.surface,
      },
      text: {
        color: colors.text,
      },
      textSecondary: {
        color: colors.textSecondary,
      },
      border: {
        borderColor: colors.border,
      },
      button: {
        backgroundColor: colors.primary,
      },
      buttonText: {
        color: '#FFFFFF',
      },
      error: {
        color: colors.error,
      },
      success: {
        color: colors.success,
      },
      warning: {
        color: colors.warning,
      },
    };
  }

  // Animation helpers
  fadeIn() {
    // Implementation would depend on animation library
    console.log('🎭 Fade in animation');
  }

  fadeOut() {
    // Implementation would depend on animation library
    console.log('🎭 Fade out animation');
  }

  slideIn(direction: 'left' | 'right' | 'up' | 'down') {
    console.log('🎭 Slide in animation:', direction);
  }

  slideOut(direction: 'left' | 'right' | 'up' | 'down') {
    console.log('🎭 Slide out animation:', direction);
  }

  // Responsive helpers
  isTablet(): boolean {
    // Would be implemented with device detection
    return false;
  }

  isLandscape(): boolean {
    return this.state.orientation === 'landscape';
  }

  // Accessibility
  announceForAccessibility(message: string): void {
    console.log('♿ Accessibility announcement:', message);
    // Implementation would use AccessibilityInfo.announceForAccessibility
  }

  // Statistics
  getStats() {
    return {
      currentTheme: this.state.currentTheme.name,
      isDarkMode: this.state.isDarkMode,
      orientation: this.state.orientation,
      isFullscreen: this.state.isFullscreen,
      activeModal: this.state.activeModal,
      showPlayerControls: this.state.showPlayerControls,
    };
  }

  // Cleanup
  destroy(): void {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    this.listeners = [];
    Appearance.removeChangeListener(this.handleSystemThemeChange);
    console.log('🧹 UIManager détruit');
  }
}