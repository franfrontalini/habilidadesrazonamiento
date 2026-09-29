# Diagnóstico de razonamiento — ADM Test C (práctica) · UTN

Aplicación web para tomar las tres pruebas del *ADM Test C (práctica)* a estudiantes de Ingeniería (1.º a 5.º año) con fines diagnósticos. El backend es Google Apps Script y los resultados se guardan en una Google Sheet.

| Prueba | Ítems | Tiempo | Estructura |
|---|---|---|---|
| Razonamiento cuantitativo | 20 | 45 min | Parte A: comparación de cantidades (1–10, opciones A–D) · Parte B: resolución de problemas (11–20, A–E) |
| Razonamiento lúdico | 12 | 30 min | Situación 1: fútbol (1–5) · Situación 2: oficinas (6–12). Reglas visibles junto a las preguntas |
| Razonamiento verbal | 17 | 40 min | Parte A: textos (1–4, 5–11) · Parte B: razonamiento crítico (12–17; 13–14 comparten texto) |

## Estructura del proyecto

```
TestHabilidades/
├── web/                     Fuente de la aplicación del estudiante
│   ├── index.html
│   ├── styles.css
│   ├── items.js             Consignas y opciones (SIN clave de respuestas)
│   └── app.js               Perfil, instrucciones, temporizador, revisión y entrega
├── apps-script/             Proyecto de Apps Script (se copia al editor)
│   ├── Code.gs              doGet/doPost, validación, corrección, guardado, menú, pruebas, análisis
│   ├── Clave.gs             Clave de respuestas (solo servidor). NO se versiona: está en .gitignore
│   ├── Clave.example.gs     Plantilla pública de Clave.gs, sin respuestas
│   ├── Index.html           GENERADO por tools/build.mjs (web/ en un solo archivo)
│   └── appsscript.json      Manifiesto: zona horaria, permisos mínimos y web app anónimo
└── tools/
    ├── build.mjs            Genera apps-script/Index.html
    ├── verificar.mjs        Verificación automática (127 comprobaciones)
    ├── extraer_clave_pdf.py Extrae la clave desde el PDF → clave_pdf.json
    └── clave_pdf.json       Clave extraída del PDF (local, no se versiona)
rama gh-pages                 Contenido de web/ publicado en GitHub Pages
```

> **El repositorio es público, pero la clave no está en él.** `apps-script/Clave.gs` y `tools/clave_pdf.json` están en `.gitignore`. Para trabajar en otra computadora, copiá `Clave.example.gs` como `Clave.gs` y completá la clave desde la página 18 del PDF (o con `tools/extraer_clave_pdf.py`); `node tools/verificar.mjs` confirma que coincide.

## Cómo funciona

- **Anonimato.** Solo se piden año (1.º, 2.º, 3.º, 4.º, 5.º, otro), carrera (lista cerrada) y condición académica (ingresante, regular, próximo a egresar). El único campo de texto es el código de acceso, que no se guarda. No hay inicio de sesión. Cada intento lleva un UUID v4 aleatorio generado en el navegador. El web app corre como la persona que lo publica, con acceso para *cualquier persona* (anónimo), así que Google no pide cuenta ni entrega el correo del estudiante. El servidor, además, rechaza cualquier campo que no esté en el esquema (`campos_no_permitidos`).
- **Clave solo en el servidor.** `items.js` no contiene respuestas. El navegador envía solo las letras elegidas; el servidor corrige con `Clave.gs`.
- **Validación en el servidor.** Se valida la sección, la versión del contenido, la cantidad exacta de ítems (20/12/17), la letra de cada ítem (A–D en cuantitativo 1–10, A–E en el resto), el perfil contra las listas cerradas, la duración y el tipo de finalización.
- **Código de acceso por prueba.** Cada prueba tiene su código en la pestaña `Configuración` (`codigo_cuantitativo`, `codigo_ludico`, `codigo_verbal`). *Configurar hojas* los genera al azar (6 caracteres, sin 0/O/1/I/L) y los muestra; se pueden cambiar cuando quieras y no distinguen mayúsculas. El estudiante lo ingresa en la pantalla de instrucciones. Al tocar *Comenzar*, el servidor lo valida y devuelve un **token firmado (HMAC) para ese intento**. La entrega se acepta solo con ese token. Por eso, cambiar el código a mitad de una toma no afecta a quien ya empezó, y nadie puede entregar sin haber pasado por el código. Ni el código ni el token se guardan en la hoja. Si una prueba no tiene código, no se puede iniciar.
- **Duplicados.** Con un `LockService` se busca el `id_intento` antes de escribir. Un reenvío (por ejemplo, tras un corte de red) devuelve "ya recibido" y no escribe de nuevo.
- **Duración efectiva.** Al tocar *Comenzar*, el servidor registra la hora de inicio (en CacheService, 6 h). Al entregar calcula `duracion_seg` con su propio reloj (`fuente_duracion = servidor`). Si el registro de inicio falló, usa la duración informada por el navegador (`fuente_duracion = cliente`). Si la entrega llega después del límite más el margen, se marca `fuera_de_tiempo = SI`.
- **Temporizador.** Siempre visible, con avisos a los 5 min y a 1 min (también para lectores de pantalla). No se detiene si se cierra o recarga la página: el intento queda en `localStorage` y se retoma. **Al llegar a 0, la prueba se entrega automáticamente** con lo marcado (`finalizacion = tiempo_agotado`) y las preguntas sin responder quedan como omitidas. Si no hay conexión, las respuestas quedan en el dispositivo y el envío se puede reintentar desde el inicio.
- **Revisión antes de entregar.** Muestra una tabla con todas las respuestas, lista las preguntas sin responder con enlaces a cada una y pide confirmación. Nunca completa respuestas.
- **Devolución.** Al entregar, el estudiante ve la confirmación de recepción y **solo su porcentaje de aciertos**. Nunca se le indica qué preguntas acertó o falló ni cuáles eran las respuestas correctas: el servidor no devuelve esa información. Con `mostrar_porcentaje = NO` se muestra solo la confirmación.
- **Accesibilidad.** Radios nativos: Tab entre controles y flechas para elegir opción. Hay enlace para saltar al contenido, foco que se mueve a cada pregunta, `role="timer"`, avisos `aria-live`, fórmulas con lectura textual para lectores de pantalla, modo oscuro, objetivos táctiles de 44 px y ancho de lectura limitado para los textos largos. En escritorio el material (reglas o texto) queda fijo a la izquierda; en celular aparece arriba y se puede plegar.

## Identidad visual

La interfaz sigue el *Manual de Identidad Visual UTN FRC* (versión reducida, mayo 2026):

- **Logos:** `web/assets/`, extraídos como vectores del manual. Se usa la versión extendida (Facultad) en escritorio y la reducida en celular, en azul, o en blanco en modo oscuro.
- **Paleta:** Azul UTN FRC `#1538B8` (oscuro `#0B2986`, claro `#D9E5F4`), Celeste Asento `#40C5F2` y los neutros `#191919`, `#E5E5E5` y `#FAFAFA`. Los tokens están al inicio de `web/styles.css`. Los pocos valores que no figuran en el manual están marcados como "derivado" y se eligieron para cumplir el contraste AA.
- **Tipografías (Google Fonts):** Barlow para textos, Noto Sans para títulos y botones, y JetBrains Mono para información tabulada (temporizador, códigos, numeración).

## Estructura de la Google Sheet

**`Intentos`**: una fila por entrega.
`id_intento, prueba, version, recibido_en, iniciado_en_servidor, anio_cursado, especialidad, condicion, duracion_seg, fuente_duracion, duracion_cliente_seg, tiempo_limite_seg, finalizacion, fuera_de_tiempo, total_items, respondidas, omitidas, puntaje, porcentaje, respuestas_cadena, es_prueba`

`respuestas_cadena` guarda las letras elegidas en orden, con `-` para las omitidas (por ejemplo `DDB-A…`).

**`Respuestas`**: una fila por ítem de cada intento (formato largo, listo para tablas dinámicas).
`id_intento, prueba, parte, pregunta, opcion_elegida, omitida, acierto, es_prueba`

**`Configuración`**: parámetros editables. Los cambios se aplican en menos de 1 minuto.

| parámetro | defecto | efecto |
|---|---|---|
| `recepcion_abierta` | SI | Con NO no se puede iniciar ni entregar |
| `mostrar_porcentaje` | **SI** | SI: al entregar se muestra solo el % de aciertos. NO: solo la confirmación |
| `codigo_cuantitativo/_ludico/_verbal` | aleatorio | Código de acceso de cada prueba. Cambialo entre tomas si querés que un código viejo deje de servir |
| `habilitada_cuantitativo/_ludico/_verbal` | SI | Habilita cada prueba |
| `minutos_cuantitativo/_ludico/_verbal` | 45/30/40 | Tiempo límite |
| `margen_entrega_seg` | 120 | Tolerancia antes de marcar `fuera_de_tiempo` |
| `especialidades` | lista UTN | Carreras separadas por ` \| `. Ajustala a tu Facultad Regional |

**`Análisis_ítems`** (se genera desde el menú): por ítem muestra dificultad *p* (global y por año, de 1.º a 5.º), tasa de omisión, índice de discriminación D (27 % superior − 27 % inferior), correlación punto-biserial corregida y distribución de opciones elegidas (útil para ver distractores). Excluye las filas con `es_prueba = SI`.

## Instalación paso a paso

### 1. Generar el archivo de la app y verificar

Hace falta Node 18 o superior, y tener `apps-script/Clave.gs` con la clave real (ver la nota sobre la clave más arriba).

```bash
node tools/build.mjs
```

```bash
node tools/verificar.mjs
```

Tiene que terminar con `127/127 verificaciones OK`.

### 2. Crear la Google Sheet y el proyecto de Apps Script

1. Creá una Google Sheet nueva, por ejemplo "Diagnóstico ADM – Resultados", con la cuenta institucional que va a ser dueña de los datos. **No la compartas con estudiantes.**
2. Andá a **Extensiones → Apps Script**. Esto crea un proyecto *vinculado* a la hoja.
3. En el editor:
   - Reemplazá el contenido de `Código.gs` (o `Code.gs`) por `apps-script/Code.gs`.
   - **+ → Secuencia de comandos**, llamala `Clave` y pegá tu `apps-script/Clave.gs` local, el que tiene la clave real. **No pegues `Clave.example.gs`.**
   - **+ → HTML**, llamalo exactamente `Index` y pegá `apps-script/Index.html` completo.
   - **Configuración del proyecto (⚙) → "Mostrar el archivo de manifiesto appsscript.json"**, y reemplazá su contenido por `apps-script/appsscript.json`.
   - Guardá.

   Si preferís la línea de comandos, con [clasp](https://github.com/google/clasp) ejecutá `clasp clone <scriptId>` dentro de `apps-script/` y después `clasp push`.
4. Volvé a la hoja y recargala. Aparece el menú **Diagnóstico ADM**.
5. **Diagnóstico ADM → 1. Configurar hojas.** La primera vez Google pide autorizar: acceso solo a *esta* hoja y a mostrar diálogos. Se crean `Intentos`, `Respuestas` y `Configuración`, y un diálogo muestra los **códigos de acceso** generados.
6. **Diagnóstico ADM → 2. Probar envío de punta a punta.** Envía una entrega sintética por el mismo camino que usa la app y comprueba que:
   - se rechaza un código de acceso incorrecto y una entrega con token falso;
   - con el código correcto se habilita el intento;
   - se corrige en el servidor (10/20, 5 omitidas, 50 %) y al estudiante se le devuelve solo el porcentaje;
   - quedan 20 filas en `Respuestas` vinculadas al mismo `id_intento`;
   - el reenvío se detecta como duplicado;
   - se rechazan un campo `correo`, una entrega con 19 ítems y una opción E en un ítem de cuatro opciones.

   Las filas quedan marcadas `es_prueba = SI`. Podés borrarlas o dejarlas, porque el análisis las excluye.

### 3. Publicar el web app

1. En el editor: **Implementar → Nueva implementación → tipo: Aplicación web**.
2. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquier persona**. No elijas "cualquier persona con cuenta de Google": exigiría iniciar sesión.
3. **Implementar** y copiá la URL que termina en `/exec`. Esa es la única URL que reciben los estudiantes. La hoja nunca se comparte.
4. Para actualizar el código después: **Implementar → Administrar implementaciones → ✏ → Versión: Nueva versión**. Así la URL se mantiene.

> Google muestra arriba un aviso del tipo "Esta aplicación fue creada por un usuario de Google Apps Script". Es normal en web apps de Apps Script.

### 4. Prueba real de punta a punta

1. Abrí la URL `/exec` en una **ventana de incógnito** (sin sesión de Google) y en un **celular**.
2. Verificá que no se pida iniciar sesión, que la pantalla inicial explique el uso diagnóstico y el análisis agregado, y que solo se pidan los tres datos de perfil.
3. Entrá a la prueba *lúdica* y probá primero un código incorrecto (tiene que rechazarlo) y después el de `codigo_ludico`. Respondé algunas preguntas, dejá otras sin responder, recargá la página a mitad de la prueba (tiene que retomarse con el tiempo corriendo) y entregá desde **Revisar y entregar**. Tenés que ver el aviso de preguntas sin responder y la confirmación de recepción con el porcentaje de aciertos, sin detalle por pregunta.
4. En la hoja:
   - En `Intentos` aparece una fila con `es_prueba = NO`, `fuente_duracion = servidor` y el puntaje calculado. Las primeras 8 letras del `id_intento` coinciden, en mayúsculas, con el código que mostró la app.
   - En `Respuestas` aparecen 12 filas con ese mismo `id_intento`.
5. Para probar el tiempo agotado, poné temporalmente `minutos_ludico = 1`, esperá un minuto y hacé otra prueba. Se tiene que entregar sola con `finalizacion = tiempo_agotado`. Después volvé a poner 30.
6. Para probar la otra política de devolución, poné `mostrar_porcentaje = NO`, entregá otra prueba (solo tiene que verse la confirmación) y volvé a `SI`.
7. **Diagnóstico ADM → Auditar datos.** Comprueba que no hay columnas identificatorias, que no hay intentos duplicados y que cada intento tiene exactamente 20/12/17 respuestas, sin respuestas huérfanas.
8. Borrá las filas de prueba antes de la toma real, o marcalas en `es_prueba`.

Opcional, para probar el endpoint `doPost` sin la interfaz (genera una fila real, que después hay que borrar). Primero iniciá el intento con el código y guardá el `token` que devuelve:

```bash
ID=$(uuidgen | tr A-Z a-z); URL="https://script.google.com/macros/s/TU_ID/exec"; curl -sL -H 'Content-Type: text/plain' -d '{"action":"iniciar","data":{"idIntento":"'"$ID"'","prueba":"ludico","codigo":"TU_CODIGO"}}' "$URL"; echo; echo "$ID"
```

Después entregá con ese mismo `ID` y el `token` recibido:

```bash
curl -sL -H 'Content-Type: text/plain' -d '{"action":"entregar","data":{"idIntento":"'"$ID"'","prueba":"ludico","version":"ADM-C-practica-v1","token":"TOKEN_RECIBIDO","perfil":{"anio":"2","especialidad":"Ingeniería Civil","condicion":"regular"},"respuestas":["E",null,"C","E","B","B","D","C","D","E","E","A"],"duracionClienteSeg":300,"finalizacion":"entregado"}}' "$URL"
```

### 5. Publicar la app en GitHub Pages

GitHub Pages sirve la rama `gh-pages`, que contiene solo los archivos de `web/`.

1. Una sola vez, en GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `gh-pages` / `(root)`**.
2. Después de cada cambio en `web/`, hacé commit en `main` y publicá:

```bash
git push origin main && git push origin `git subtree split --prefix web main`:refs/heads/gh-pages --force
```

La app queda en `https://franfrontalini.github.io/habilidadesrazonamiento/` (tarda uno o dos minutos en actualizarse).

3. Mientras `<meta name="adm-endpoint">` en `web/index.html` esté vacío, la app funciona en **modo demostración**: acepta cualquier código, no guarda nada y no muestra porcentaje.
4. Para conectarla a la hoja, pegá la URL `/exec` del web app en ese `<meta>`, hacé commit y volvé a publicar. La app usa `fetch` contra `doPost`: se exigen los códigos reales, se guarda en la hoja y se muestra el porcentaje.

La URL `/exec` sola también sirve la misma app desde Google. Podés usar cualquiera de las dos.

### Vista local (sin servidor)

```bash
python3 -m http.server 8765 --directory web
```

Abrí `http://localhost:8765`. En este **modo demostración** no se envía nada. Si querés alojar `web/` en otro sitio (por ejemplo GitHub Pages), poné la URL `/exec` en `<meta name="adm-endpoint">` de `web/index.html`. La app va a usar `fetch` contra `doPost`.

## Mantenimiento

- Si editás algo en `web/`, volvé a correr `node tools/build.mjs`, pegá el nuevo `Index.html` y publicá una nueva versión.
- Si cambiás el contenido de los ítems, actualizá `VERSION_PRUEBAS` en `Clave.gs` y `version` en `items.js`. El servidor rechaza entregas con otra versión.
- Para volver a comprobar la clave contra el PDF:

```bash
python3 -m pip install pypdf
```

```bash
python3 tools/extraer_clave_pdf.py "ADM Test C (práctica).pdf"
```

```bash
node tools/verificar.mjs
```

## Puntos de transcripción para revisión docente

Todo el contenido se transcribió en el orden del PDF. Las fórmulas se revisaron contra las páginas renderizadas, no contra el texto extraído (que llega desordenado en las ecuaciones). No hay partes ilegibles. Estos casos se mantuvieron literales y conviene revisarlos:

- **Cuantitativo 4:** el operador es la letra griega Ψ: `p Ψ r = pr − p + r`.
- **Cuantitativo 13, opción B:** en el PDF el índice de la raíz es muy pequeño. El texto extraído confirma `√2 × ∛3`.
- **Lúdico, regla 2:** dice "K juega primero N" (sin "contra").
- **Lúdico 12:** dice "Si P es asignado la 104" (falta "a").
- **Verbal 2, 6 y 11:** dependen de las **negritas** del texto. Se reprodujeron las mismas.
- **Verbal 14, opción E:** dice "deber ser" (errata por "debe ser").
- **Verbal 15:** dice "pasar frente la escuela" (falta "a").

La clave del PDF se verificó de forma automática. Además, se resolvieron a mano los 20 ítems cuantitativos y los ítems lúdicos 1–5 y 12, y todos coinciden con la clave.

## Limitaciones y decisiones

- El temporizador visible usa el reloj del dispositivo. El control válido es el del servidor (`duracion_seg` y `fuera_de_tiempo`).
- Los intentos son independientes: no se vinculan las tres pruebas de un mismo estudiante. Si hiciera falta para analizar correlaciones entre secciones, se puede agregar un identificador aleatorio de "sesión" por dispositivo, también anónimo.
- Apps Script admite unas 30 ejecuciones simultáneas. Las escrituras se serializan con un lock de 20 s. Si un curso numeroso entrega todo a la vez y algún envío recibe "servidor ocupado", el estudiante puede reintentar sin riesgo de duplicar.
- Los códigos de acceso quedan en la pestaña `Configuración`, que solo ve el equipo docente. No hay límite de intentos contra un código: con 6 caracteres de un alfabeto de 31 hay unas 887 millones de combinaciones. Aun así, conviene cambiarlo después de cada toma.
- El PDF es material del IAE Business School (Universidad Austral). Antes de usarlo con estudiantes, confirmá que la institución tiene autorización para ese uso.
