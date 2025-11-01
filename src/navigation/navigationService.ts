import {
  createNavigationContainerRef,
  StackActions,
} from '@react-navigation/native';

// Crée une référence au conteneur de navigation
export const navigationRef = createNavigationContainerRef();

/**
 * Permet de naviguer vers un écran depuis n'importe où dans l'application.
 * @param name Le nom de l'écran de destination.
 * @param params Les paramètres à passer à l'écran.
 */
export function navigate(name: string, params?: object) {
  if (navigationRef.isReady()) {
    // @ts-ignore
    navigationRef.navigate(name, params);
  }
}

/**
 * Permet de remplacer l'écran actuel par un nouveau dans la pile de navigation.
 * @param name Le nom de l'écran de destination.
 * @param params Les paramètres à passer à l'écran.
 */
export function replace(name: string, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      // @ts-ignore
      StackActions.replace(name, params),
    );
  }
}
