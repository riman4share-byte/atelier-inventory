// Apply the saved theme before the first paint so the app never flashes the
// wrong colour on load.
//
// This lives in its own file rather than inline in index.html because the
// site's Content-Security-Policy allows scripts from the site itself only -
// an inline script is blocked by the browser, and the theme then jumped
// after the page had already painted.
(function () {
  try {
    var stored = localStorage.getItem('atelier.theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : null;
    var dark =
      theme === 'dark' ||
      (theme === null &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (theme) root.setAttribute('data-theme', theme);
    root.style.colorScheme = dark ? 'dark' : 'light';
    var meta = document.getElementById('theme-color');
    if (meta) meta.setAttribute('content', dark ? '#161513' : '#f7f4ee');
  } catch (error) {
    // A blocked localStorage must not stop the app from booting.
  }
})();
