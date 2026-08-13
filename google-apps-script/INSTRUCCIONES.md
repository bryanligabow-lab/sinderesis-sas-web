# Conectar el formulario con Google Sheets

El formulario de la página guarda cada solicitud en una hoja de cálculo de
Google, **creando automáticamente una pestaña nueva por cada día**
(`2026-08-13`, `2026-08-14`, …). Si el visitante adjunta un documento, este se
sube a Google Drive y en la hoja queda el enlace.

Todo esto funciona con **Google Apps Script**: es gratuito, no necesita
servidor y es compatible con GitHub Pages.

> Estos pasos hay que hacerlos desde la cuenta de Google de SINDERESIS
> (idealmente la cuenta del correo institucional), porque la hoja y los
> archivos quedan guardados en ese Drive.

---

## 1. Crear la hoja de cálculo

1. Entra a [sheets.new](https://sheets.new) para crear una hoja nueva.
2. Ponle un nombre, por ejemplo **Solicitudes web — SINDERESIS**.
3. No hace falta crear encabezados ni pestañas: el script los genera solo.

## 2. Pegar el script

1. En esa misma hoja, abre el menú **Extensiones → Apps Script**.
2. Borra todo el contenido que aparece en el editor (`function myFunction() {}`).
3. Abre el archivo `Codigo.gs` de esta carpeta, copia **todo** su contenido y
   pégalo en el editor.
4. Arriba, donde dice *Proyecto sin título*, ponle un nombre como
   **Formulario SINDERESIS**.
5. Guarda con el ícono del disquete (o `Ctrl + S`).

### Ajustes opcionales

Al inicio del script está el bloque `CONFIG`. Puedes dejarlo tal cual, o:

- `CORREO_AVISO`: si pones un correo (ej. `'blog.juridico@sinderesis.ec'`),
  recibirás un aviso por cada solicitud nueva.
- `ID_CARPETA_DRIVE`: si quieres que los adjuntos se guarden en una carpeta
  específica de Drive. Si lo dejas vacío, el script crea una carpeta llamada
  *Adjuntos formulario SINDERESIS*.
- `ID_HOJA_CALCULO`: **déjalo vacío** si seguiste el paso 2 desde la hoja.

## 3. Publicar la aplicación web

1. Arriba a la derecha, clic en **Implementar → Nueva implementación**.
2. Clic en el ícono del engranaje ⚙️ junto a *Seleccionar tipo* y elige
   **Aplicación web**.
3. Completa así:
   - **Descripción:** `Formulario web`
   - **Ejecutar como:** `Yo (tu correo)`
   - **Quién tiene acceso:** `Cualquier usuario`  ← **importante**
4. Clic en **Implementar**.
5. Google pedirá permisos: **Autorizar acceso** → elige tu cuenta → en la
   pantalla de advertencia entra en **Configuración avanzada** →
   **Ir a Formulario SINDERESIS (no seguro)** → **Permitir**.

   > Esa advertencia es normal: aparece porque el script es tuyo y no está
   > verificado por Google. Estás autorizando tu propio código.

6. Copia la **URL de la aplicación web**. Termina en `/exec` y se ve así:

   ```
   https://script.google.com/macros/s/AKfycb...../exec
   ```

## 4. Pegar la URL en la página

1. Abre el archivo `js/main.js`.
2. En la línea 12, pega la URL entre las comillas:

   ```js
   const ENDPOINT_SHEETS = 'https://script.google.com/macros/s/AKfycb...../exec';
   ```

3. Guarda el archivo.

Con eso queda funcionando. Si me pasas la URL, yo hago este paso y publico el
cambio en el sitio.

---

## Comprobar que funciona

1. Pega la URL `/exec` en el navegador. Debe mostrar:
   *SINDERESIS S.A.S. — receptor de formulario activo.*
2. Entra a la página, completa el formulario y envíalo.
3. Revisa la hoja de cálculo: debe aparecer una pestaña con la fecha de hoy y
   la solicitud registrada.

## Qué se guarda en cada fila

| Columna | Contenido |
|---|---|
| Fecha y hora | Momento de envío (hora de Ecuador) |
| Nombre completo | Del formulario |
| Teléfono | Del formulario |
| Correo electrónico | Del formulario |
| Área legal | Penal, Tránsito, Constitucional, etc. |
| Fecha preferida | Para la cita (si la indicó) |
| Mensaje | Descripción del caso |
| Documento adjunto | Enlace al archivo en Drive |
| Origen | Página desde la que se envió |

---

## Notas

- **Límite de adjuntos:** 5 MB. Se puede cambiar en `js/main.js`
  (`MAX_MB_ADJUNTO`).
- **Si cambias el script** más adelante, hay que volver a
  **Implementar → Administrar implementaciones → editar ✏️ → Versión: Nueva
  versión → Implementar**. La URL no cambia.
- **Datos personales:** la hoja contendrá información de casos legales.
  Conviene limitarla a las personas del estudio que deban verla
  (botón *Compartir* de la hoja) y no publicarla.
- Mientras `ENDPOINT_SHEETS` esté vacío, el formulario sigue funcionando:
  abre el cliente de correo del visitante con los datos completados.
