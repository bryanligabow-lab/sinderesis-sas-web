// ===== SINDERESIS S.A.S. — interacciones =====

/* ------------------------------------------------------------------
   CONFIGURACIÓN DEL FORMULARIO

   Las solicitudes se envían a enviar.php (en el mismo hosting), que las
   reenvía por correo al estudio y guarda una copia de respaldo.
------------------------------------------------------------------ */
const ENDPOINT_FORMULARIO = 'enviar.php';

// Tamaño máximo permitido para el documento adjunto.
const MAX_MB_ADJUNTO = 5;

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

/* ===== Carrusel de ubicación (mapa / fotografía) ===== */

document.querySelectorAll('[data-carrusel]').forEach(carrusel => {
  const slides = [...carrusel.querySelectorAll('.media-slide')];
  const puntos = [...carrusel.querySelectorAll('.media-dot')];
  const leyenda = carrusel.querySelector('.media-caption');
  if (slides.length < 2) return;

  let actual = 0;

  function mostrar(indice) {
    actual = (indice + slides.length) % slides.length;

    slides.forEach((s, i) => s.classList.toggle('is-active', i === actual));
    puntos.forEach((p, i) => p.classList.toggle('is-active', i === actual));

    if (leyenda) {
      leyenda.innerHTML = slides[actual].dataset.caption || '';
    }
  }

  carrusel.querySelector('.media-prev').addEventListener('click', () => mostrar(actual - 1));
  carrusel.querySelector('.media-next').addEventListener('click', () => mostrar(actual + 1));
  puntos.forEach((p, i) => p.addEventListener('click', () => mostrar(i)));

  mostrar(0);
});

/* ===== Formulario de contacto ===== */

const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');
const submitBtn = contactForm.querySelector('button[type="submit"]');

function mostrarEstado(mensaje, tipo) {
  formNote.textContent = mensaje;
  formNote.className = 'form-note' + (tipo ? ' form-note-' + tipo : '');
}

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const archivo = document.getElementById('archivo').files[0];
  if (archivo && archivo.size > MAX_MB_ADJUNTO * 1024 * 1024) {
    mostrarEstado(
      'El documento supera los ' + MAX_MB_ADJUNTO + ' MB. Envíalo por WhatsApp o correo.',
      'error'
    );
    return;
  }

  submitBtn.disabled = true;
  mostrarEstado('Enviando tu solicitud…', null);

  try {
    const respuesta = await fetch(ENDPOINT_FORMULARIO, {
      method: 'POST',
      body: new FormData(contactForm)
    });
    const resultado = await respuesta.json();

    if (!resultado.ok) {
      mostrarEstado(
        resultado.mensaje || 'No pudimos enviar la solicitud. Escríbenos por WhatsApp al 0979 228 852.',
        'error'
      );
      return;
    }

    contactForm.reset();
    mostrarEstado(
      '¡Gracias! Recibimos tu solicitud y te contactaremos a la brevedad.',
      'ok'
    );

  } catch (error) {
    mostrarEstado(
      'No pudimos enviar la solicitud. Escríbenos por WhatsApp al 0979 228 852.',
      'error'
    );

  } finally {
    submitBtn.disabled = false;
  }
});
