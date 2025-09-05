// Loader y transición de página
// Este script muestra un loader al cargar la página y una animación de salida al recargarla

document.addEventListener('DOMContentLoaded', () => {
  const loader = document.createElement('div');
  loader.id = 'page-loader';
  loader.innerHTML = `<div class="loader-spinner"></div>`;
  document.body.appendChild(loader);

  setTimeout(() => {
    loader.classList.add('loaded');
    setTimeout(() => loader.remove(), 500);
  }, 1200); // Puedes ajustar el tiempo
});

window.addEventListener('beforeunload', () => {
  const loader = document.createElement('div');
  loader.id = 'page-loader';
  loader.className = 'exit';
  loader.innerHTML = `<div class="loader-spinner"></div>`;
  document.body.appendChild(loader);
});
