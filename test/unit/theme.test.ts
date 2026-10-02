import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  applyChoice,
  readChoice,
  saveChoice,
  setUpThemeSwitch,
  type ThemeButton,
  type ThemeStorage,
} from '../../public/theme.js';

function memoryStorage(initial: Record<string, string> = {}): ThemeStorage & { values: Record<string, string> } {
  const values = { ...initial };
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    },
    removeItem: (key) => {
      delete values[key];
    },
  };
}

const blockedStorage: ThemeStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

function fakeButton(choice: string): ThemeButton & { pressed: () => string | undefined; click: () => void } {
  const attributes: Record<string, string> = {};
  let listener = () => {};
  return {
    dataset: { themeChoice: choice },
    setAttribute: (name, value) => {
      attributes[name] = value;
    },
    addEventListener: (_type, handler) => {
      listener = handler;
    },
    pressed: () => attributes['aria-pressed'],
    click: () => listener(),
  };
}

describe('readChoice', () => {
  it('follows the computer when nothing is saved', () => {
    expect(readChoice(memoryStorage())).toBe('system');
  });

  it('reads a saved light or dark', () => {
    expect(readChoice(memoryStorage({ [STORAGE_KEY]: 'light' }))).toBe('light');
    expect(readChoice(memoryStorage({ [STORAGE_KEY]: 'dark' }))).toBe('dark');
  });

  it('treats an unknown value or blocked storage as system', () => {
    expect(readChoice(memoryStorage({ [STORAGE_KEY]: 'purple' }))).toBe('system');
    expect(readChoice(blockedStorage)).toBe('system');
  });
});

describe('saveChoice', () => {
  it('saves light or dark under todo-theme', () => {
    const storage = memoryStorage();
    saveChoice(storage, 'dark');
    expect(storage.values).toEqual({ 'todo-theme': 'dark' });
  });

  it('removes the saved value when system is chosen', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: 'dark' });
    saveChoice(storage, 'system');
    expect(storage.values).toEqual({});
  });

  it('does not throw when storage is blocked', () => {
    expect(() => saveChoice(blockedStorage, 'dark')).not.toThrow();
  });
});

describe('applyChoice', () => {
  it('sets data-theme for light or dark and removes it for system', () => {
    const root: { dataset: Record<string, string | undefined> } = { dataset: {} };
    applyChoice(root, 'dark');
    expect(root.dataset.theme).toBe('dark');
    applyChoice(root, 'light');
    expect(root.dataset.theme).toBe('light');
    applyChoice(root, 'system');
    expect('theme' in root.dataset).toBe(false);
  });
});

describe('setUpThemeSwitch', () => {
  it('marks the saved choice pressed, and a click saves, applies and marks the new one', () => {
    const buttons = ['system', 'light', 'dark'].map(fakeButton);
    const storage = memoryStorage({ [STORAGE_KEY]: 'light' });
    const root: { dataset: Record<string, string | undefined> } = { dataset: { theme: 'light' } };

    setUpThemeSwitch({ querySelectorAll: () => buttons }, storage, root);
    expect(buttons.map((button) => button.pressed())).toEqual(['false', 'true', 'false']);

    buttons[2].click();
    expect(storage.values).toEqual({ 'todo-theme': 'dark' });
    expect(root.dataset.theme).toBe('dark');
    expect(buttons.map((button) => button.pressed())).toEqual(['false', 'false', 'true']);

    buttons[0].click();
    expect(storage.values).toEqual({});
    expect('theme' in root.dataset).toBe(false);
    expect(buttons.map((button) => button.pressed())).toEqual(['true', 'false', 'false']);
  });
});
