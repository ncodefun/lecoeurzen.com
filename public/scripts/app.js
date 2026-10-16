const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const presentationModal = document.getElementById('presentation-fr');

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

document.getElementById('logo').addEventListener('click', async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  try {
    await root.requestFullscreen();
  } catch (error) {
    console.error(`Fullscreen error: ${error.message}`);
  }
});

document.getElementById('egg').addEventListener('click', () => presentationModal.showModal());
presentationModal.addEventListener('click', (event) => {
  const rect = presentationModal.getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX <= rect.right
    && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (!inside) presentationModal.close();
});

const qrToggle = document.getElementById('qr-toggle');
qrToggle.addEventListener('click', () => {
  const isOpen = qrToggle.getAttribute('aria-expanded') === 'true';
  qrToggle.setAttribute('aria-expanded', String(!isOpen));
});
document.addEventListener('click', (event) => {
  if (!qrToggle.contains(event.target)) qrToggle.setAttribute('aria-expanded', 'false');
});
