/* public/js/theme.js */
function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.contains('dark-mode');
  body.classList.toggle('dark-mode', !isDark);
  body.classList.toggle('light-mode', isDark);
  try { localStorage.setItem('theme', isDark ? 'light' : 'dark'); } catch(e){}
}

// Restore saved theme
(function(){
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  } catch(e) {}
})();