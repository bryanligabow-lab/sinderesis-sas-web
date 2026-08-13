// ===== SINDERESIS S.A.S. — interacciones =====

/* ------------------------------------------------------------------
   CONFIGURACIÓN DEL FORMULARIO

   Pega aquí la URL de la aplicación web de Google Apps Script
   (termina en /exec). Ver google-apps-script/INSTRUCCIONES.md

   Mientras esté vacío, el formulario seguirá funcionando abriendo el
   cliente de correo del visitante.
------------------------------------------------------------------ */
const ENDPOINT_SHEETS = 'https://script.google.com/macros/s/AKfycbz9C30CMOqz37DIQ5ocuPhg_1p6htnP481U-ZFif2DT5HK3SvVUa38bPLfOhx2Hjtsc5A/exec';

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

/* ===== Formulario de contacto ===== */

const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');
const submitBtn = contactForm.querySelector('button[type="submit"]');

function mostrarEstado(mensaje, tipo) {
  formNote.textContent = mensaje;
  formNote.className = 'form-note' + (tipo ? ' form-note-' + tipo : '');
}

/** Lee el archivo adjunto y lo devuelve en base64. */
function leerArchivo(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(',')[1] || '');
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.readAsDataURL(archivo);
  });
}

/** Respaldo: abre el cliente de correo con los datos completados. */
function enviarPorCorreo(d) {
  const asunto = encodeURIComponent('Solicitud de consulta - ' + d.nombre);
  const cuerpo = encodeURIComponent(
    'Nombre: ' + d.nombre + '\n' +
    'Teléfono: ' + d.telefono + '\n' +
    'Correo: ' + d.email + '\n' +
    'Área legal: ' + d.area + '\n' +
    'Fecha preferida: ' + d.fecha + '\n\n' +
    'Mensaje:\n' + d.mensaje
  );
  window.location.href =
    'mailto:blog.juridico@sinderesis.ec?subject=' + asunto + '&body=' + cuerpo;
}

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fd = new FormData(contactForm);
  const datos = {
    nombre: fd.get('nombre') || '',
    telefono: fd.get('telefono') || '',
    email: fd.get('email') || '',
    area: fd.get('area') || '',
    fecha: fd.get('fecha') || '',
    mensaje: fd.get('mensaje') || ''
  };

  // Sin endpoint configurado: se mantiene el envío por correo.
  if (!ENDPOINT_SHEETS) {
    enviarPorCorreo(datos);
    return;
  }

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
    const cuerpo = new URLSearchParams(datos);
    cuerpo.append('origen', window.location.href);

    if (archivo) {
      cuerpo.append('archivoNombre', archivo.name);
      cuerpo.append('archivoTipo', archivo.type || 'application/octet-stream');
      cuerpo.append('archivoDatos', await leerArchivo(archivo));
    }

    // Apps Script no devuelve cabeceras CORS: se envía en modo no-cors.
    // La solicitud sí se registra, aunque el navegador no lea la respuesta.
    await fetch(ENDPOINT_SHEETS, {
      method: 'POST',
      mode: 'no-cors',
      body: cuerpo
    });

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
