/**
 * 👤 UserStore - Zustand Store
 * Remplace les contextes utilisateur pour la gestion d'état
 */

import {create} from 'zustand';
import type {User} from '../types';

export interface UserStoreState {
  // État
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  setUsers: (users: User[]) => void;
  setCurrentUser: (user: User | null) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  removeUser: (id: string) => void;
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  // État initial
  users: [],
  currentUser: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  // Actions
  setUsers: users => set({users}),

  setCurrentUser: user =>
    set({
      currentUser: user,
      isAuthenticated: user !== null,
    }),

  addUser: user =>
    set(state => ({
      users: [...state.users, user],
    })),

  updateUser: (id, updates) =>
    set(state => ({
      users: state.users.map(u => (u.id === id ? {...u, ...updates} : u)),
      currentUser:
        state.currentUser?.id === id
          ? {...state.currentUser, ...updates}
          : state.currentUser,
    })),

  removeUser: id =>
    set(state => ({
      users: state.users.filter(u => u.id !== id),
      currentUser: state.currentUser?.id === id ? null : state.currentUser,
      isAuthenticated:
        state.currentUser?.id === id ? false : state.isAuthenticated,
    })),

  login: user =>
    set({
      currentUser: user,
      isAuthenticated: true,
      error: null,
    }),

  logout: () =>
    set({
      currentUser: null,
      isAuthenticated: false,
    }),

  setLoading: loading => set({loading}),
  setError: error => set({error}),

  reset: () =>
    set({
      users: [],
      currentUser: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    }),
}));
