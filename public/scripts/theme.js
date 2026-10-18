// Shared by every page; the saved theme is applied early by an inline script in <head>.
const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');

function applyTheme(isDark) {
  root.dataset.theme = isDark ? 'dark' : 'light';
  themeToggle.setAttribute('aria-pressed', String(isDark));
}

applyTheme(root.dataset.theme === 'dark');

themeToggle.addEventListener('click', () => {
  const isDark = root.dataset.theme !== 'dark';
  applyTheme(isDark);

  try {
    localStorage.setItem('zen-theme', isDark ? 'dark' : 'light');
  } catch {
    // The theme still works when storage is unavailable.
  }
});
