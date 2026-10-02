// The page follows the computer's light or dark setting unless the person picks
// Light or Dark in the header. The pick is saved in this browser; System clears it.
// index.html repeats readChoice in a tiny inline script so a saved theme applies
// before the first paint.

export const STORAGE_KEY = 'todo-theme';
export const CHOICES = ['system', 'light', 'dark'];

export function readChoice(storage) {
  try {
    const value = storage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function saveChoice(storage, choice) {
  try {
    if (choice === 'light' || choice === 'dark') storage.setItem(STORAGE_KEY, choice);
    else storage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked, as in some private windows: the pick lasts for this visit only.
  }
}

export function applyChoice(root, choice) {
  if (choice === 'light' || choice === 'dark') root.dataset.theme = choice;
  else delete root.dataset.theme;
}

export function setUpThemeSwitch(container, storage, root) {
  const buttons = [...container.querySelectorAll('button[data-theme-choice]')];
  const show = (choice) => {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === choice));
    }
  };
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const choice = button.dataset.themeChoice;
      saveChoice(storage, choice);
      applyChoice(root, choice);
      show(choice);
    });
  }
  show(readChoice(storage));
}
