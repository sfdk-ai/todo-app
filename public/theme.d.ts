export type ThemeChoice = 'system' | 'light' | 'dark';

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ThemeRoot {
  dataset: Record<string, string | undefined>;
}

export interface ThemeButton {
  dataset: Record<string, string | undefined>;
  setAttribute(name: string, value: string): void;
  addEventListener(type: 'click', listener: () => void): void;
}

export interface ThemeContainer {
  querySelectorAll(selector: string): Iterable<ThemeButton>;
}

export const STORAGE_KEY: 'todo-theme';
export const CHOICES: readonly ThemeChoice[];
export function readChoice(storage: ThemeStorage): ThemeChoice;
export function saveChoice(storage: ThemeStorage, choice: string | undefined): void;
export function applyChoice(root: ThemeRoot, choice: string | undefined): void;
export function setUpThemeSwitch(container: ThemeContainer, storage: ThemeStorage, root: ThemeRoot): void;
