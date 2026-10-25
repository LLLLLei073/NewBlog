/** One persisted reading theme for the header and the room's lamp. */
export function setSiteTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Private/blocked storage must not prevent changing the current page.
  }
}

export function toggleSiteTheme() {
  setSiteTheme(
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
  );
}
