document.addEventListener("DOMContentLoaded", () => {
  const panel = document.querySelector('.weather-widget');
  if (!panel) return;

  // Start fully visible
  panel.classList.remove('fade-out');
  panel.style.opacity = '';

  let hovering = false;

  panel.addEventListener('mouseenter', () => {
    hovering = true;
  });

  panel.addEventListener('mouseleave', () => {
    hovering = false;
  });

  // Fade after 30 seconds (unless the user is hovering at that moment)
  setTimeout(() => {
    if (!hovering) panel.classList.add('fade-out');
  }, 30000);

  // If they hover later, CSS will show it at full opacity, and it will
  // return to faded state on mouseleave because the class remains.
});
