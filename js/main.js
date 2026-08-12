// ===== SINDERESIS S.A.S. — interacciones =====

document.getElementById('year').textContent = new Date().getFullYear();

// Menú móvil
const hamburger = document.getElementById('hamburger');
const mainNav = document.getElementById('mainNav');

hamburger.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// Acordeón de preguntas frecuentes
document.querySelectorAll('.accordion-header').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.accordion-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// Formulario de contacto -> abre cliente de correo con los datos
// NOTA PARA EL DESARROLLADOR: para envío automático real (incluyendo el
// archivo adjunto), conecta este formulario a un backend o a un servicio
// de formularios (por ejemplo Formspree, EmailJS o un endpoint propio).
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const data = new FormData(contactForm);
  const nombre = data.get('nombre');
  const telefono = data.get('telefono');
  const email = data.get('email');
  const area = data.get('area');
  const fecha = data.get('fecha') || 'No especificada';
  const mensaje = data.get('mensaje');

  const subject = encodeURIComponent(`Solicitud de consulta - ${nombre}`);
  const body = encodeURIComponent(
    `Nombre: ${nombre}\n` +
    `Teléfono: ${telefono}\n` +
    `Correo: ${email}\n` +
    `Área legal: ${area}\n` +
    `Fecha preferida: ${fecha}\n\n` +
    `Mensaje:\n${mensaje}`
  );

  window.location.href = `mailto:blog.juridico@sinderesis.ec?subject=${subject}&body=${body}`;
});
