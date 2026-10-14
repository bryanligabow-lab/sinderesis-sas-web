<?php
/**
 * SINDERESIS S.A.S. — Recepción de solicitudes del formulario web
 *
 * Envía cada solicitud por correo (con el documento adjunto, si lo hay) y
 * guarda una copia en solicitudes/registro.csv como respaldo.
 */

// Varios destinatarios separados por coma.
const CORREO_DESTINO = 'blog.juridico@sinderesis.ec, websinderesis@gmail.com';
const CORREO_REMITENTE = 'formulario@sinderesis.ec';
const MAX_BYTES_ADJUNTO = 5 * 1024 * 1024;
const EXTENSIONES_PERMITIDAS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
const CARPETA_REGISTRO = __DIR__ . '/solicitudes';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function responder(bool $ok, string $mensaje, int $codigo = 200): void {
  http_response_code($codigo);
  echo json_encode(['ok' => $ok, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
  exit;
}

/** Texto de una sola línea, sin saltos (evita inyección de cabeceras). */
function campo(string $nombre, int $max): string {
  $valor = trim((string)($_POST[$nombre] ?? ''));
  $valor = preg_replace('/[\r\n\t]+/', ' ', $valor);
  return mb_substr($valor, 0, $max);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  responder(false, 'Método no permitido.', 405);
}

// Campo trampa: los visitantes reales no lo ven ni lo llenan.
if (trim((string)($_POST['sitio_web'] ?? '')) !== '') {
  responder(true, 'Solicitud recibida.');
}

$nombre   = campo('nombre', 120);
$telefono = campo('telefono', 40);
$email    = campo('email', 120);
$area     = campo('area', 60);
$fecha    = campo('fecha', 20);
$mensaje  = mb_substr(trim((string)($_POST['mensaje'] ?? '')), 0, 5000);

if ($nombre === '' || $telefono === '' || $mensaje === '' ||
    !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  responder(false, 'Revisa los datos del formulario e inténtalo de nuevo.', 422);
}

// --- Documento adjunto (opcional)
$adjunto = null;
if (isset($_FILES['archivo']) && $_FILES['archivo']['error'] !== UPLOAD_ERR_NO_FILE) {
  $archivo = $_FILES['archivo'];
  if ($archivo['error'] !== UPLOAD_ERR_OK || $archivo['size'] > MAX_BYTES_ADJUNTO) {
    responder(false, 'El documento supera los 5 MB. Envíalo por WhatsApp o correo.', 422);
  }
  $extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
  if (!in_array($extension, EXTENSIONES_PERMITIDAS, true)) {
    responder(false, 'Formato no permitido. Adjunta un PDF, imagen o documento de Word.', 422);
  }
  $adjunto = [
    'nombre' => preg_replace('/[^A-Za-z0-9._-]+/', '_', basename($archivo['name'])),
    'datos'  => file_get_contents($archivo['tmp_name']),
  ];
}

date_default_timezone_set('America/Guayaquil');
$sello = date('d/m/Y H:i:s');

// --- Respaldo en CSV (carpeta protegida del acceso web)
$guardado = false;
if (!is_dir(CARPETA_REGISTRO)) {
  @mkdir(CARPETA_REGISTRO, 0755, true);
}
if (is_dir(CARPETA_REGISTRO)) {
  $bloqueo = CARPETA_REGISTRO . '/.htaccess';
  if (!file_exists($bloqueo)) {
    @file_put_contents($bloqueo, "Require all denied\n");
  }
  $ruta = CARPETA_REGISTRO . '/registro.csv';
  $nuevo = !file_exists($ruta);
  $fh = @fopen($ruta, 'a');
  if ($fh && flock($fh, LOCK_EX)) {
    if ($nuevo) {
      fwrite($fh, "\xEF\xBB\xBF");
      fputcsv($fh, ['Fecha y hora', 'Nombre completo', 'Teléfono', 'Correo electrónico',
                    'Área legal', 'Fecha preferida', 'Mensaje', 'Documento adjunto']);
    }
    // El apóstrofo inicial evita que Excel interprete el texto como fórmula.
    $fila = array_map(
      fn($v) => preg_match('/^[=+\-@]/', $v) ? "'" . $v : $v,
      [$sello, $nombre, $telefono, $email, $area, $fecha, $mensaje,
       $adjunto ? $adjunto['nombre'] . ' (enviado por correo)' : '']
    );
    $guardado = fputcsv($fh, $fila) !== false;
    flock($fh, LOCK_UN);
  }
  if ($fh) fclose($fh);
}

// --- Correo
$texto = "Nueva solicitud desde www.sinderesis.ec\n\n"
       . "Fecha y hora: $sello\n"
       . "Nombre: $nombre\n"
       . "Teléfono: $telefono\n"
       . "Correo: $email\n"
       . "Área legal: $area\n"
       . "Fecha preferida: " . ($fecha !== '' ? $fecha : 'No indicada') . "\n\n"
       . "Mensaje:\n$mensaje\n";

$asunto = '=?UTF-8?B?' . base64_encode("Solicitud de consulta - $nombre") . '?=';
$cabeceras = [
  'From: =?UTF-8?B?' . base64_encode('Formulario web SINDERESIS') . '?= <' . CORREO_REMITENTE . '>',
  'Reply-To: ' . $email,
  'MIME-Version: 1.0',
];

if ($adjunto) {
  $limite = 'sinderesis-' . bin2hex(random_bytes(12));
  $cabeceras[] = "Content-Type: multipart/mixed; boundary=\"$limite\"";
  $cuerpo = "--$limite\r\n"
          . "Content-Type: text/plain; charset=UTF-8\r\n"
          . "Content-Transfer-Encoding: base64\r\n\r\n"
          . chunk_split(base64_encode($texto)) . "\r\n"
          . "--$limite\r\n"
          . "Content-Type: application/octet-stream; name=\"{$adjunto['nombre']}\"\r\n"
          . "Content-Transfer-Encoding: base64\r\n"
          . "Content-Disposition: attachment; filename=\"{$adjunto['nombre']}\"\r\n\r\n"
          . chunk_split(base64_encode($adjunto['datos'])) . "\r\n"
          . "--$limite--\r\n";
} else {
  $cabeceras[] = 'Content-Type: text/plain; charset=UTF-8';
  $cabeceras[] = 'Content-Transfer-Encoding: base64';
  $cuerpo = chunk_split(base64_encode($texto));
}

$enviado = @mail(CORREO_DESTINO, $asunto, $cuerpo, implode("\r\n", $cabeceras),
                 '-f' . CORREO_REMITENTE);

if (!$enviado && !$guardado) {
  responder(false, 'No pudimos registrar la solicitud.', 500);
}
// Con adjunto, el documento solo viaja por correo: sin correo no hay entrega completa.
if (!$enviado && $adjunto) {
  responder(false, 'No pudimos recibir el documento. Envíalo por WhatsApp al 0979 228 852.', 500);
}
responder(true, 'Solicitud recibida.');
