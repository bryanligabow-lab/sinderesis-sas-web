/**
 * SINDERESIS S.A.S. — Recepción de solicitudes del formulario web
 *
 * Guarda cada solicitud en una hoja NUEVA POR DÍA (pestaña con el nombre
 * yyyy-MM-dd), y opcionalmente sube el documento adjunto a Google Drive.
 *
 * Ver INSTRUCCIONES.md para la instalación paso a paso.
 */

const CONFIG = {
  // Déjalo vacío si pegas este script desde la propia hoja de cálculo
  // (Extensiones > Apps Script). Si lo creas como proyecto independiente,
  // pon aquí el ID de la hoja (lo que va entre /d/ y /edit en la URL).
  ID_HOJA_CALCULO: '',

  // Opcional: ID de una carpeta de Drive para guardar los adjuntos.
  // Si lo dejas vacío, se creará automáticamente una carpeta llamada
  // "Adjuntos formulario SINDERESIS".
  ID_CARPETA_DRIVE: '',

  ZONA_HORARIA: 'America/Guayaquil',

  // Opcional: correo que recibirá un aviso por cada nueva solicitud.
  // Ejemplo: 'blog.juridico@sinderesis.ec'. Vacío = sin aviso.
  CORREO_AVISO: ''
};

const ENCABEZADOS = [
  'Fecha y hora',
  'Nombre completo',
  'Teléfono',
  'Correo electrónico',
  'Área legal',
  'Fecha preferida',
  'Mensaje',
  'Documento adjunto',
  'Origen'
];

/** Punto de entrada: recibe el POST del formulario. */
function doPost(e) {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const p = (e && e.parameter) ? e.parameter : {};

    const ss = abrirHojaCalculo_();
    const hoja = hojaDelDia_(ss);

    const ahora = new Date();
    const sello = Utilities.formatDate(ahora, CONFIG.ZONA_HORARIA, 'dd/MM/yyyy HH:mm:ss');

    const enlaceArchivo = guardarAdjunto_(p, sello);

    hoja.appendRow([
      sello,
      p.nombre || '',
      p.telefono || '',
      p.email || '',
      p.area || '',
      p.fecha || '(no especificada)',
      p.mensaje || '',
      enlaceArchivo || '(sin adjunto)',
      p.origen || ''
    ]);

    ajustarFormato_(hoja);
    enviarAviso_(p, sello, enlaceArchivo);

    return respuesta_({ ok: true });

  } catch (error) {
    console.error(error);
    return respuesta_({ ok: false, error: String(error) });

  } finally {
    bloqueo.releaseLock();
  }
}

/** Permite comprobar en el navegador que la app está publicada. */
function doGet() {
  return ContentService
    .createTextOutput('SINDERESIS S.A.S. — receptor de formulario activo.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/* ------------------------------------------------------------------ */

function abrirHojaCalculo_() {
  if (CONFIG.ID_HOJA_CALCULO) {
    return SpreadsheetApp.openById(CONFIG.ID_HOJA_CALCULO);
  }
  const activa = SpreadsheetApp.getActiveSpreadsheet();
  if (!activa) {
    throw new Error(
      'No se encontró la hoja de cálculo. Completa CONFIG.ID_HOJA_CALCULO.'
    );
  }
  return activa;
}

/** Devuelve la pestaña del día de hoy; la crea si aún no existe. */
function hojaDelDia_(ss) {
  const nombre = Utilities.formatDate(new Date(), CONFIG.ZONA_HORARIA, 'yyyy-MM-dd');
  let hoja = ss.getSheetByName(nombre);

  if (!hoja) {
    hoja = ss.insertSheet(nombre, 0);
    hoja.appendRow(ENCABEZADOS);

    hoja.getRange(1, 1, 1, ENCABEZADOS.length)
      .setFontWeight('bold')
      .setBackground('#0b2545')
      .setFontColor('#ffffff')
      .setVerticalAlignment('middle');

    hoja.setFrozenRows(1);
    hoja.setRowHeight(1, 34);

    const anchos = [150, 200, 130, 230, 190, 140, 420, 260, 220];
    anchos.forEach(function (ancho, i) {
      hoja.setColumnWidth(i + 1, ancho);
    });
  }

  return hoja;
}

/** Sube el adjunto a Drive y devuelve su enlace. */
function guardarAdjunto_(p, sello) {
  if (!p.archivoDatos || !p.archivoNombre) return '';

  try {
    const bytes = Utilities.base64Decode(p.archivoDatos);
    const blob = Utilities.newBlob(
      bytes,
      p.archivoTipo || 'application/octet-stream',
      sello.replace(/[\/:]/g, '-') + ' — ' + p.archivoNombre
    );
    return carpetaAdjuntos_().createFile(blob).getUrl();

  } catch (error) {
    console.error('No se pudo guardar el adjunto: ' + error);
    return '(error al guardar el adjunto)';
  }
}

function carpetaAdjuntos_() {
  if (CONFIG.ID_CARPETA_DRIVE) {
    return DriveApp.getFolderById(CONFIG.ID_CARPETA_DRIVE);
  }
  const nombre = 'Adjuntos formulario SINDERESIS';
  const existentes = DriveApp.getFoldersByName(nombre);
  return existentes.hasNext() ? existentes.next() : DriveApp.createFolder(nombre);
}

function ajustarFormato_(hoja) {
  const fila = hoja.getLastRow();
  hoja.getRange(fila, 1, 1, ENCABEZADOS.length)
    .setVerticalAlignment('top')
    .setWrap(true);
}

function enviarAviso_(p, sello, enlaceArchivo) {
  if (!CONFIG.CORREO_AVISO) return;

  try {
    MailApp.sendEmail({
      to: CONFIG.CORREO_AVISO,
      subject: 'Nueva solicitud web — ' + (p.nombre || 'sin nombre'),
      body: [
        'Se recibió una nueva solicitud desde la página web.',
        '',
        'Fecha y hora: ' + sello,
        'Nombre: ' + (p.nombre || ''),
        'Teléfono: ' + (p.telefono || ''),
        'Correo: ' + (p.email || ''),
        'Área legal: ' + (p.area || ''),
        'Fecha preferida: ' + (p.fecha || '(no especificada)'),
        '',
        'Mensaje:',
        p.mensaje || '',
        '',
        'Adjunto: ' + (enlaceArchivo || '(sin adjunto)')
      ].join('\n')
    });
  } catch (error) {
    console.error('No se pudo enviar el aviso: ' + error);
  }
}

function respuesta_(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
