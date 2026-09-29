/**
 * ADM Test C (práctica) — backend en Google Apps Script.
 *
 * - Sirve la aplicación (doGet) y recibe entregas por google.script.run o
 *   por POST (doPost), ambas por las mismas funciones api*.
 * - Valida cada entrega, corrige con la clave del servidor (Clave.gs),
 *   evita duplicados por id de intento y guarda en la hoja vinculada.
 * - No registra datos identificatorios: no se consulta el usuario ni el
 *   correo (Session.getActiveUser), y se rechaza cualquier campo que no
 *   esté en el esquema.
 */

var HOJA_INTENTOS = 'Intentos';
var HOJA_RESPUESTAS = 'Respuestas';
var HOJA_CONFIG = 'Configuración';
var HOJA_ANALISIS = 'Análisis_ítems';

var COLUMNAS_INTENTOS = [
  'id_intento', 'prueba', 'version', 'recibido_en', 'iniciado_en_servidor',
  'sexo', 'franja_etaria', 'pertenece_utn', 'vinculo_utn', 'especialidad', 'anio_cursado', 'nivel_academico',
  'duracion_seg', 'fuente_duracion', 'duracion_cliente_seg', 'tiempo_limite_seg',
  'finalizacion', 'fuera_de_tiempo',
  'total_items', 'respondidas', 'omitidas', 'puntaje', 'porcentaje',
  'respuestas_cadena', 'es_prueba'
];
var COLUMNAS_RESPUESTAS = [
  'id_intento', 'prueba', 'parte', 'pregunta', 'opcion_elegida', 'omitida', 'acierto', 'es_prueba'
];

// Opciones cerradas del perfil. El orden es el que ve el estudiante.
var PERFIL_SEXOS = ['femenino', 'masculino', 'otro', 'prefiero_no_responder'];
var PERFIL_EDADES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
var PERFIL_UTN = ['si', 'no'];
var PERFIL_VINCULOS = ['estudiante', 'graduado', 'docente', 'nodocente'];
var PERFIL_ANIOS = ['1', '2', '3', '4', '5', 'otro'];
var PERFIL_NIVELES = ['secundario', 'terciario', 'universitario', 'especializacion', 'maestria', 'doctorado'];
var ESPECIALIDAD_NO_APLICA = 'No aplica';
var ESPECIALIDADES_POR_DEFECTO = [
  'Ingeniería Civil', 'Ingeniería Eléctrica', 'Ingeniería Electromecánica',
  'Ingeniería Electrónica', 'Ingeniería Industrial', 'Ingeniería Mecánica',
  'Ingeniería Metalúrgica', 'Ingeniería Química',
  'Ingeniería en Sistemas de Información', 'Otra'
];

// Parámetros de la pestaña Configuración: [clave, valor por defecto, descripción].
var CONFIG_POR_DEFECTO = [
  ['recepcion_abierta', 'SI', 'SI/NO. Con NO la aplicación no deja iniciar ni entregar pruebas.'],
  ['mostrar_porcentaje', 'SI', 'SI/NO. Si es SI, al entregar el estudiante ve solo su % de aciertos (nunca qué ítems falló ni las respuestas correctas).'],
  ['codigo_cuantitativo', '', 'Código de acceso a la prueba cuantitativa (se genera al configurar; se puede cambiar). No distingue mayúsculas.'],
  ['codigo_ludico', '', 'Código de acceso a la prueba lúdica.'],
  ['codigo_verbal', '', 'Código de acceso a la prueba verbal.'],
  ['habilitada_cuantitativo', 'SI', 'SI/NO. Habilita la prueba de razonamiento cuantitativo.'],
  ['habilitada_ludico', 'SI', 'SI/NO. Habilita la prueba de razonamiento lúdico.'],
  ['habilitada_verbal', 'SI', 'SI/NO. Habilita la prueba de razonamiento verbal.'],
  ['minutos_cuantitativo', '45', 'Tiempo límite en minutos (referencia del PDF: 45).'],
  ['minutos_ludico', '30', 'Tiempo límite en minutos (referencia del PDF: 30).'],
  ['minutos_verbal', '40', 'Tiempo límite en minutos (referencia del PDF: 40).'],
  ['margen_entrega_seg', '120', 'Segundos de tolerancia tras el límite antes de marcar la entrega como fuera_de_tiempo.'],
  ['especialidades', ESPECIALIDADES_POR_DEFECTO.join(' | '), 'Lista de carreras ofrecidas, separadas por " | ". Ajustar a la oferta de la Facultad Regional.']
];

var CLAVES_ENTREGA = ['idIntento', 'prueba', 'version', 'token', 'perfil', 'respuestas', 'duracionClienteSeg', 'finalizacion'];
var CLAVES_PERFIL = ['sexo', 'edad', 'utn', 'vinculo', 'especialidad', 'anio', 'nivel'];
var FINALIZACIONES = ['entregado', 'tiempo_agotado'];
var UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/* ======================================================================
 * Puntos de entrada web
 * ==================================================================== */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Diagnóstico de razonamiento · UTN')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Permite alojar la app fuera de Apps Script o probar con curl. */
function doPost(e) {
  var salida;
  try {
    var cuerpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (cuerpo.action === 'config') salida = apiConfig();
    else if (cuerpo.action === 'iniciar') salida = apiIniciar(cuerpo.data);
    else if (cuerpo.action === 'entregar') salida = apiEntregar(cuerpo.data);
    else salida = { ok: false, error: 'accion_invalida' };
  } catch (err) {
    salida = { ok: false, error: 'solicitud_invalida' };
  }
  return ContentService.createTextOutput(JSON.stringify(salida))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ======================================================================
 * API (usada por google.script.run y por doPost)
 * ==================================================================== */

/** Configuración pública: nunca incluye la clave ni datos de la hoja. */
function apiConfig() {
  var c = leerConfig_();
  var pruebas = {};
  Object.keys(ESPECIFICACION).forEach(function (id) {
    pruebas[id] = {
      habilitada: c['habilitada_' + id],
      minutos: c['minutos_' + id],
      items: ESPECIFICACION[id].items
    };
  });
  return {
    ok: true,
    version: VERSION_PRUEBAS,
    recepcionAbierta: c.recepcion_abierta,
    mostrarPorcentaje: c.mostrar_porcentaje,
    pruebas: pruebas,
    perfil: {
      sexos: PERFIL_SEXOS, edades: PERFIL_EDADES, vinculos: PERFIL_VINCULOS, anios: PERFIL_ANIOS,
      niveles: PERFIL_NIVELES, especialidades: c.especialidades.concat([ESPECIALIDAD_NO_APLICA])
    }
  };
}

/**
 * Valida el código de acceso de la prueba, registra la hora de inicio (para
 * medir la duración efectiva) y devuelve un token firmado para ese intento.
 * El código no se guarda en ningún lado; la entrega solo exige el token, así
 * que cambiar el código no afecta a quienes ya comenzaron.
 */
function apiIniciar(data) {
  data = data || {};
  var c = leerConfig_();
  if (!c.recepcion_abierta) return { ok: false, error: 'recepcion_cerrada' };
  if (!ESPECIFICACION.hasOwnProperty(data.prueba)) return { ok: false, error: 'prueba_invalida' };
  if (!c['habilitada_' + data.prueba]) return { ok: false, error: 'prueba_deshabilitada' };
  if (typeof data.idIntento !== 'string' || !UUID_V4.test(data.idIntento)) return { ok: false, error: 'id_invalido' };
  var codigo = c['codigo_' + data.prueba];
  if (!codigo) return { ok: false, error: 'codigo_no_configurado' };
  if (typeof data.codigo !== 'string' || normalizarCodigo_(data.codigo) !== codigo) {
    return { ok: false, error: 'codigo_invalido' };
  }
  if (buscarIntento_(data.idIntento)) return { ok: false, error: 'ya_entregado' };

  var cache = CacheService.getScriptCache();
  var k = 'ini:' + data.idIntento;
  if (!cache.get(k)) {
    cache.put(k, JSON.stringify({ prueba: data.prueba, t: Date.now() }), 21600); // 6 h (máximo)
  }
  return { ok: true, minutos: c['minutos_' + data.prueba], token: firmarIntento_(data.idIntento, data.prueba) };
}

/** Recibe, valida, corrige y guarda una entrega. */
function apiEntregar(data) {
  return entregar_(data, false);
}

function entregar_(data, esPrueba) {
  var c = leerConfig_();
  if (!c.recepcion_abierta) return { ok: false, error: 'recepcion_cerrada' };

  var v = validarEntrega_(data, c);
  if (!v.ok) return v;
  var e = v.entrega;
  // Solo se acepta una entrega de un intento iniciado con el código correcto.
  if (data.token !== firmarIntento_(e.idIntento, e.prueba)) return { ok: false, error: 'token_invalido' };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'servidor_ocupado' };
  try {
    var existente = buscarIntento_(e.idIntento);
    if (existente) return respuestaRecepcion_(existente, c, true);

    var ahora = new Date();
    var inicio = leerInicio_(e.idIntento, e.prueba);
    var limiteSeg = c['minutos_' + e.prueba] * 60;
    var duracion = inicio ? Math.round((ahora.getTime() - inicio) / 1000) : e.duracionClienteSeg;
    var fuente = inicio ? 'servidor' : 'cliente';
    var r = corregir_(e.prueba, e.respuestas);

    var fila = {
      id_intento: e.idIntento,
      prueba: e.prueba,
      version: e.version,
      recibido_en: ahora,
      iniciado_en_servidor: inicio ? new Date(inicio) : '',
      sexo: e.perfil.sexo,
      franja_etaria: e.perfil.edad,
      pertenece_utn: e.perfil.utn,
      vinculo_utn: e.perfil.vinculo,
      especialidad: e.perfil.especialidad,
      anio_cursado: e.perfil.anio,
      nivel_academico: e.perfil.nivel,
      duracion_seg: duracion,
      fuente_duracion: fuente,
      duracion_cliente_seg: e.duracionClienteSeg,
      tiempo_limite_seg: limiteSeg,
      finalizacion: e.finalizacion,
      fuera_de_tiempo: duracion > limiteSeg + c.margen_entrega_seg ? 'SI' : 'NO',
      total_items: r.total,
      respondidas: r.respondidas,
      omitidas: r.omitidas,
      puntaje: r.puntaje,
      porcentaje: r.porcentaje,
      respuestas_cadena: e.respuestas.map(function (x) { return x || '-'; }).join(''),
      es_prueba: esPrueba ? 'SI' : 'NO'
    };

    var ss = libro_();
    ss.getSheetByName(HOJA_INTENTOS).appendRow(COLUMNAS_INTENTOS.map(function (k) { return fila[k]; }));
    var filasResp = r.detalle.map(function (d) {
      return [e.idIntento, e.prueba, d.parte, d.n, d.elegida || '', d.elegida ? 0 : 1, d.acierto ? 1 : 0, esPrueba ? 'SI' : 'NO'];
    });
    var hr = ss.getSheetByName(HOJA_RESPUESTAS);
    hr.getRange(hr.getLastRow() + 1, 1, filasResp.length, COLUMNAS_RESPUESTAS.length).setValues(filasResp);
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove('ini:' + e.idIntento);

    return respuestaRecepcion_(fila, c, false);
  } finally {
    lock.releaseLock();
  }
}

/* ======================================================================
 * Lógica pura (sin acceso a la hoja): validación y corrección
 * ==================================================================== */

/**
 * Valida la entrega contra el esquema. Rechaza campos desconocidos para
 * que no pueda colarse ningún dato identificatorio.
 */
function validarEntrega_(d, c) {
  function error(codigo, detalle) { return { ok: false, error: codigo, detalle: detalle || '' }; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return error('entrega_invalida');

  var extra = Object.keys(d).filter(function (k) { return CLAVES_ENTREGA.indexOf(k) < 0; });
  if (extra.length) return error('campos_no_permitidos', extra.join(','));

  if (typeof d.idIntento !== 'string' || !UUID_V4.test(d.idIntento)) return error('id_invalido');
  if (!ESPECIFICACION.hasOwnProperty(d.prueba)) return error('prueba_invalida');
  if (!c['habilitada_' + d.prueba]) return error('prueba_deshabilitada');
  if (d.version !== VERSION_PRUEBAS) return error('version_invalida');
  if (typeof d.token !== 'string' || d.token.length > 200) return error('token_invalido');

  var p = d.perfil;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return error('perfil_invalido');
  var extraP = Object.keys(p).filter(function (k) { return CLAVES_PERFIL.indexOf(k) < 0; });
  if (extraP.length) return error('campos_no_permitidos', extraP.join(','));
  var perfil = validarPerfil_(p, c);
  if (perfil.error) return error('perfil_invalido', perfil.error);

  var spec = ESPECIFICACION[d.prueba];
  if (!Array.isArray(d.respuestas) || d.respuestas.length !== spec.items) return error('cantidad_items_invalida');
  var respuestas = [];
  for (var i = 0; i < d.respuestas.length; i++) {
    var x = d.respuestas[i];
    if (x === null || x === '') { respuestas.push(null); continue; }
    if (typeof x !== 'string' || x.length !== 1 || spec.opciones(i + 1).indexOf(x) < 0) {
      return error('opcion_invalida', 'pregunta ' + (i + 1));
    }
    respuestas.push(x);
  }

  var dur = d.duracionClienteSeg;
  if (typeof dur !== 'number' || !isFinite(dur) || dur < 0 || dur > 86400) return error('duracion_invalida');
  if (FINALIZACIONES.indexOf(d.finalizacion) < 0) return error('finalizacion_invalida');

  return {
    ok: true,
    entrega: {
      idIntento: d.idIntento, prueba: d.prueba, version: d.version,
      perfil: perfil,
      respuestas: respuestas, duracionClienteSeg: Math.round(dur), finalizacion: d.finalizacion
    }
  };
}

/**
 * Perfil con preguntas condicionales:
 * - Siempre: sexo, franja etaria, pertenencia a la UTN y máximo nivel académico.
 * - Solo si pertenece a la UTN: vínculo y especialidad (o "No aplica").
 * - Solo si es estudiante de la UTN: año de cursado.
 * Lo que no corresponde debe llegar vacío (''). Devuelve el perfil normalizado o {error}.
 */
function validarPerfil_(p, c) {
  function vacio(v) { return v === '' || v === null || v === undefined; }
  if (PERFIL_SEXOS.indexOf(p.sexo) < 0) return { error: 'sexo' };
  if (PERFIL_EDADES.indexOf(p.edad) < 0) return { error: 'edad' };
  if (PERFIL_UTN.indexOf(p.utn) < 0) return { error: 'utn' };
  if (PERFIL_NIVELES.indexOf(p.nivel) < 0) return { error: 'nivel' };
  var esUtn = p.utn === 'si';
  if (esUtn) {
    if (PERFIL_VINCULOS.indexOf(p.vinculo) < 0) return { error: 'vinculo' };
    if (c.especialidades.concat([ESPECIALIDAD_NO_APLICA]).indexOf(p.especialidad) < 0) return { error: 'especialidad' };
  } else if (!vacio(p.vinculo) || !vacio(p.especialidad)) {
    return { error: 'vinculo_sin_utn' };
  }
  var esEstudiante = esUtn && p.vinculo === 'estudiante';
  if (esEstudiante && PERFIL_ANIOS.indexOf(p.anio) < 0) return { error: 'anio' };
  if (!esEstudiante && !vacio(p.anio)) return { error: 'anio_sin_estudiante' };
  return {
    sexo: p.sexo, edad: p.edad, utn: p.utn,
    vinculo: esUtn ? p.vinculo : '', especialidad: esUtn ? p.especialidad : '',
    anio: esEstudiante ? p.anio : '', nivel: p.nivel
  };
}

/** Corrige con la clave del servidor: 1 punto por acierto, omitidas = 0. */
function corregir_(prueba, respuestas) {
  var spec = ESPECIFICACION[prueba];
  var clave = CLAVE[prueba];
  var detalle = [], puntaje = 0, omitidas = 0;
  for (var i = 0; i < spec.items; i++) {
    var elegida = respuestas[i] || null;
    var acierto = elegida !== null && elegida === clave[i];
    if (acierto) puntaje++;
    if (elegida === null) omitidas++;
    detalle.push({ n: i + 1, parte: spec.parte(i + 1), elegida: elegida, correcta: clave[i], acierto: acierto });
  }
  return {
    total: spec.items,
    puntaje: puntaje,
    omitidas: omitidas,
    respondidas: spec.items - omitidas,
    porcentaje: Math.round(puntaje / spec.items * 1000) / 10,
    detalle: detalle
  };
}

/** Normaliza los valores crudos de la pestaña Configuración. */
function normalizarConfig_(crudo) {
  var c = {};
  CONFIG_POR_DEFECTO.forEach(function (fila) {
    var k = fila[0];
    var v = crudo.hasOwnProperty(k) && String(crudo[k]).trim() !== '' ? String(crudo[k]).trim() : fila[1];
    c[k] = v;
  });
  ['recepcion_abierta', 'mostrar_porcentaje',
    'habilitada_cuantitativo', 'habilitada_ludico', 'habilitada_verbal'].forEach(function (k) {
    c[k] = /^(si|sí|true|1)$/i.test(c[k]);
  });
  Object.keys(ESPECIFICACION).forEach(function (id) {
    var n = parseInt(c['minutos_' + id], 10);
    c['minutos_' + id] = n > 0 && n <= 240 ? n : ESPECIFICACION[id].minutos;
    c['codigo_' + id] = normalizarCodigo_(c['codigo_' + id]);
  });
  var margen = parseInt(c.margen_entrega_seg, 10);
  c.margen_entrega_seg = margen >= 0 ? margen : 120;
  c.especialidades = String(c.especialidades).split('|')
    .map(function (s) { return s.trim(); }).filter(function (s) { return s; });
  return c;
}

function normalizarCodigo_(s) {
  return String(s || '').trim().toUpperCase();
}

/**
 * Qué ve el estudiante al entregar: solo el porcentaje de aciertos.
 * Nunca se devuelve qué ítems acertó ni las respuestas correctas.
 */
function respuestaRecepcion_(fila, c, duplicado) {
  var out = { ok: true, recibido: true, duplicado: duplicado, idIntento: fila.id_intento };
  if (c.mostrar_porcentaje) out.resultado = { porcentaje: fila.porcentaje };
  return out;
}

/* ======================================================================
 * Token de intento (firma HMAC con un secreto del servidor)
 * ==================================================================== */

function firmarIntento_(id, prueba) {
  var firma = Utilities.computeHmacSha256Signature(id + '|' + prueba, secreto_());
  return Utilities.base64EncodeWebSafe(firma);
}

function secreto_() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('SECRETO_FIRMA');
  if (s) return s;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    s = props.getProperty('SECRETO_FIRMA');
    if (!s) {
      s = Utilities.getUuid() + Utilities.getUuid();
      props.setProperty('SECRETO_FIRMA', s);
    }
    return s;
  } finally {
    lock.releaseLock();
  }
}

/** Código aleatorio legible (sin 0/O/1/I/L). */
function generarCodigo_() {
  var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var out = '';
  for (var i = 0; i < 6; i++) out += abc.charAt(Math.floor(Math.random() * abc.length));
  return out;
}

/* ======================================================================
 * Acceso a la hoja
 * ==================================================================== */

// El script está vinculado a la hoja: también en el web app devuelve esa hoja.
// Así alcanza el permiso mínimo "spreadsheets.currentonly".
function libro_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function leerConfig_() {
  var cache = CacheService.getScriptCache();
  var enCache = cache.get('config');
  var crudo;
  if (enCache) {
    crudo = JSON.parse(enCache);
  } else {
    crudo = {};
    var hoja = libro_().getSheetByName(HOJA_CONFIG);
    if (hoja && hoja.getLastRow() > 1) {
      hoja.getRange(2, 1, hoja.getLastRow() - 1, 2).getValues().forEach(function (f) {
        if (f[0]) crudo[String(f[0]).trim()] = f[1];
      });
    }
    cache.put('config', JSON.stringify(crudo), 60); // cambios visibles en ≤ 1 minuto
  }
  return normalizarConfig_(crudo);
}

/** Devuelve la fila (como objeto) del intento, o null si no existe. */
function buscarIntento_(id) {
  var hoja = libro_().getSheetByName(HOJA_INTENTOS);
  if (hoja.getLastRow() < 2) return null;
  var celda = hoja.getRange(2, 1, hoja.getLastRow() - 1, 1)
    .createTextFinder(id).matchEntireCell(true).findNext();
  if (!celda) return null;
  var valores = hoja.getRange(celda.getRow(), 1, 1, COLUMNAS_INTENTOS.length).getValues()[0];
  var fila = {};
  COLUMNAS_INTENTOS.forEach(function (k, i) { fila[k] = valores[i]; });
  return fila;
}

function leerInicio_(id, prueba) {
  var v = CacheService.getScriptCache().get('ini:' + id);
  if (!v) return null;
  var o = JSON.parse(v);
  return o.prueba === prueba ? o.t : null;
}

/* ======================================================================
 * Instalación, menú y utilidades para el equipo docente
 * ==================================================================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Diagnóstico ADM')
    .addItem('1. Configurar hojas', 'configurarHojas')
    .addItem('2. Probar envío de punta a punta', 'probarEnvioDePuntaAPunta')
    .addItem('Generar análisis de ítems', 'generarAnalisisItems')
    .addItem('Auditar datos', 'auditarDatos')
    .addToUi();
}

/** Crea (o completa) las pestañas con encabezados y valores por defecto. */
function configurarHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('America/Argentina/Buenos_Aires');

  var archivadas = archivarSiCambioEsquema_(ss);
  prepararHoja_(ss, HOJA_INTENTOS, COLUMNAS_INTENTOS);
  prepararHoja_(ss, HOJA_RESPUESTAS, COLUMNAS_RESPUESTAS);

  var hc = ss.getSheetByName(HOJA_CONFIG) || ss.insertSheet(HOJA_CONFIG);
  if (hc.getLastRow() === 0) hc.appendRow(['parametro', 'valor', 'descripcion']);
  // Texto plano en "valor" para que "SI", "45" o un código no se reinterpreten.
  hc.getRange('B:B').setNumberFormat('@');
  var existentes = hc.getLastRow() > 1
    ? hc.getRange(2, 1, hc.getLastRow() - 1, 1).getValues().map(function (f) { return String(f[0]); })
    : [];
  CONFIG_POR_DEFECTO.forEach(function (f) {
    if (existentes.indexOf(f[0]) >= 0) return;
    var fila = f.slice();
    if (/^codigo_/.test(fila[0])) fila[1] = generarCodigo_();
    hc.appendRow(fila);
  });
  hc.setFrozenRows(1);
  hc.getRange(1, 1, 1, 3).setFontWeight('bold');
  hc.setColumnWidth(1, 200); hc.setColumnWidth(2, 260); hc.setColumnWidth(3, 520);
  secreto_();

  var defecto = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (defecto && defecto.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(defecto);

  CacheService.getScriptCache().remove('config');
  var c = leerConfig_();
  avisar_('Hojas listas: Intentos, Respuestas y Configuración.\n\n' +
    (archivadas ? 'Las columnas cambiaron: los datos anteriores se movieron a "' + archivadas.join('" y "') + '".\n\n' : '') +
    'Códigos de acceso:\n' +
    Object.keys(ESPECIFICACION).map(function (id) { return '- ' + ESPECIFICACION[id].titulo + ': ' + (c['codigo_' + id] || '(sin código)'); }).join('\n'));
}

/**
 * Si "Intentos" tiene encabezados de una versión anterior del perfil, renombra
 * "Intentos" y "Respuestas" (juntas, para no dejar respuestas huérfanas) y
 * deja que se creen vacías con el esquema actual. No borra nada.
 */
function archivarSiCambioEsquema_(ss) {
  var hi = ss.getSheetByName(HOJA_INTENTOS);
  if (!hi || hi.getLastRow() === 0) return null;
  var actuales = hi.getRange(1, 1, 1, Math.max(hi.getLastColumn(), 1)).getValues()[0]
    .filter(function (v) { return v !== ''; });
  if (actuales.join('|') === COLUMNAS_INTENTOS.join('|')) return null;
  var sufijo = ' (anterior ' + Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd HH.mm') + ')';
  var nombres = [];
  [HOJA_INTENTOS, HOJA_RESPUESTAS].forEach(function (n) {
    var h = ss.getSheetByName(n);
    if (h) { h.setName(n + sufijo); nombres.push(n + sufijo); }
  });
  return nombres;
}

function prepararHoja_(ss, nombre, columnas) {
  var h = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  if (h.getLastRow() === 0) {
    h.appendRow(columnas);
  } else {
    var actuales = h.getRange(1, 1, 1, columnas.length).getValues()[0];
    if (actuales.join('|') !== columnas.join('|')) {
      throw new Error('La pestaña "' + nombre + '" tiene encabezados distintos a los esperados. Revisala antes de continuar.');
    }
  }
  h.setFrozenRows(1);
  h.getRange(1, 1, 1, columnas.length).setFontWeight('bold').setBackground('#e8eef7');
  // La columna id_intento como texto evita que Sheets transforme el UUID.
  h.getRange('A:A').setNumberFormat('@');
}

/**
 * Prueba de punta a punta desde el editor o el menú: envía una entrega
 * sintética por el mismo camino que la app, verifica corrección, vínculo
 * con Respuestas y rechazo de duplicados. Las filas quedan con es_prueba=SI.
 */
function probarEnvioDePuntaAPunta() {
  var errores = [];
  var c = leerConfig_();
  var id = Utilities.getUuid().toLowerCase();
  // Primeras 10 respuestas correctas, 11–15 incorrectas, 16–20 omitidas.
  var clave = CLAVE.cuantitativo;
  var resp = clave.map(function (k, i) {
    if (i < 10) return k;
    if (i < 15) return k === 'A' ? 'B' : 'A';
    return null;
  });
  if (apiIniciar({ idIntento: id, prueba: 'cuantitativo', codigo: 'CODIGO-INCORRECTO' }).error !== 'codigo_invalido') {
    errores.push('Un código de acceso incorrecto no fue rechazado.');
  }
  var ini = apiIniciar({ idIntento: id, prueba: 'cuantitativo', codigo: c.codigo_cuantitativo.toLowerCase() });
  if (!ini.ok) errores.push('No se pudo iniciar con el código de la pestaña Configuración: ' + JSON.stringify(ini));
  var payload = {
    idIntento: id, prueba: 'cuantitativo', version: VERSION_PRUEBAS, token: ini.token || '',
    perfil: { sexo: 'prefiero_no_responder', edad: '18-24', utn: 'si', vinculo: 'estudiante',
      especialidad: c.especialidades[0], anio: '3', nivel: 'secundario' },
    respuestas: resp, duracionClienteSeg: 600, finalizacion: 'entregado'
  };
  var sinToken = JSON.parse(JSON.stringify(payload));
  sinToken.token = 'falso';
  if (entregar_(sinToken, true).error !== 'token_invalido') errores.push('Una entrega sin token válido no fue rechazada.');

  var r1 = entregar_(payload, true);
  if (!r1.ok) errores.push('La entrega fue rechazada: ' + JSON.stringify(r1));
  var devuelto = JSON.stringify(r1.resultado || {});
  if (/detalle|correcta|puntaje|omitidas/.test(devuelto)) errores.push('La respuesta al estudiante incluye más que el porcentaje: ' + devuelto);
  if (c.mostrar_porcentaje && (!r1.resultado || r1.resultado.porcentaje !== 50)) errores.push('No se devolvió el porcentaje (50) al estudiante.');

  var fila = buscarIntento_(id);
  if (!fila) errores.push('No se encontró el intento en "Intentos".');
  else {
    if (fila.puntaje !== 10) errores.push('Puntaje esperado 10, obtenido ' + fila.puntaje);
    if (fila.omitidas !== 5) errores.push('Omitidas esperadas 5, obtenidas ' + fila.omitidas);
    if (fila.porcentaje !== 50) errores.push('Porcentaje esperado 50, obtenido ' + fila.porcentaje);
  }

  var hr = libro_().getSheetByName(HOJA_RESPUESTAS);
  var vinculadas = hr.getRange(2, 1, Math.max(hr.getLastRow() - 1, 1), COLUMNAS_RESPUESTAS.length).getValues()
    .filter(function (f) { return f[0] === id; });
  if (vinculadas.length !== 20) errores.push('Se esperaban 20 filas en "Respuestas" para el intento; hay ' + vinculadas.length);
  var aciertos = vinculadas.reduce(function (s, f) { return s + f[6]; }, 0);
  if (aciertos !== 10) errores.push('Suma de aciertos en "Respuestas" = ' + aciertos + ' (esperado 10)');

  var r2 = entregar_(payload, true);
  if (!r2.ok || !r2.duplicado) errores.push('El reenvío del mismo id no fue detectado como duplicado.');
  var repetidas = libro_().getSheetByName(HOJA_INTENTOS).getRange('A:A').getValues()
    .filter(function (f) { return f[0] === id; }).length;
  if (repetidas !== 1) errores.push('El intento aparece ' + repetidas + ' veces en "Intentos".');

  var malo = JSON.parse(JSON.stringify(payload));
  malo.idIntento = Utilities.getUuid().toLowerCase();
  malo.correo = 'x@y.z';
  if (entregar_(malo, true).error !== 'campos_no_permitidos') errores.push('Un campo extra (correo) no fue rechazado.');
  malo = JSON.parse(JSON.stringify(payload));
  malo.idIntento = Utilities.getUuid().toLowerCase();
  malo.respuestas = resp.slice(0, 19);
  if (entregar_(malo, true).error !== 'cantidad_items_invalida') errores.push('Una entrega con 19 ítems no fue rechazada.');
  malo.respuestas = resp.slice(); malo.respuestas[0] = 'E';
  if (entregar_(malo, true).error !== 'opcion_invalida') errores.push('La opción E en un ítem de 4 opciones no fue rechazada.');

  var msg = errores.length
    ? 'FALLÓ la prueba de punta a punta:\n- ' + errores.join('\n- ')
    : 'OK. Intento de prueba ' + id + ' guardado (es_prueba=SI), corregido (10/20, 5 omitidas; al estudiante solo se le devuelve el %), código y token verificados, vinculado a 20 respuestas y protegido contra duplicados.';
  Logger.log(msg);
  avisar_(msg);
  return msg;
}

/**
 * Verifica integridad y privacidad de los datos guardados:
 * encabezados sin campos identificatorios, cada respuesta vinculada a un
 * intento existente y cada intento con la cantidad exacta de respuestas.
 */
function auditarDatos() {
  var ss = libro_();
  var problemas = [];
  var prohibidos = /(nombre|apellido|legajo|dni|documento|correo|email|mail|telefono|usuario|ip)/i;
  [HOJA_INTENTOS, HOJA_RESPUESTAS].forEach(function (n) {
    var h = ss.getSheetByName(n);
    var enc = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
    enc.forEach(function (e) { if (prohibidos.test(String(e))) problemas.push('Columna sospechosa en ' + n + ': ' + e); });
  });

  var intentos = ss.getSheetByName(HOJA_INTENTOS).getDataRange().getValues().slice(1);
  var resp = ss.getSheetByName(HOJA_RESPUESTAS).getDataRange().getValues().slice(1);
  var porIntento = {};
  resp.forEach(function (f) { porIntento[f[0]] = (porIntento[f[0]] || 0) + 1; });
  var ids = {};
  intentos.forEach(function (f) {
    var id = f[0], prueba = f[1];
    if (ids[id]) problemas.push('Intento duplicado: ' + id);
    ids[id] = true;
    if (!UUID_V4.test(String(id))) problemas.push('Id de intento con formato inesperado: ' + id);
    var esperado = ESPECIFICACION[prueba] ? ESPECIFICACION[prueba].items : -1;
    if ((porIntento[id] || 0) !== esperado) {
      problemas.push('Intento ' + id + ' (' + prueba + ') tiene ' + (porIntento[id] || 0) + ' respuestas; se esperaban ' + esperado);
    }
  });
  Object.keys(porIntento).forEach(function (id) {
    if (!ids[id]) problemas.push('Respuestas huérfanas (sin intento): ' + id);
  });

  var msg = problemas.length
    ? 'Auditoría con observaciones:\n- ' + problemas.slice(0, 30).join('\n- ')
    : 'Auditoría OK: ' + intentos.length + ' intentos, ' + resp.length + ' respuestas, todas vinculadas; sin columnas identificatorias.';
  Logger.log(msg);
  avisar_(msg);
  return msg;
}

/**
 * Análisis clásico de ítems (excluye es_prueba=SI):
 * dificultad p (proporción de aciertos) global y por año, tasa de omisión,
 * discriminación D (grupo superior − inferior, 27 %) y correlación
 * punto-biserial corregida (ítem vs. puntaje sin el ítem), más la
 * distribución de opciones elegidas.
 */
function generarAnalisisItems() {
  var ss = libro_();
  var intentos = ss.getSheetByName(HOJA_INTENTOS).getDataRange().getValues().slice(1)
    .filter(function (f) { return f[COLUMNAS_INTENTOS.indexOf('es_prueba')] !== 'SI'; });
  var iPrueba = COLUMNAS_INTENTOS.indexOf('prueba'), iCadena = COLUMNAS_INTENTOS.indexOf('respuestas_cadena');
  var iAnio = COLUMNAS_INTENTOS.indexOf('anio_cursado');
  var enc = ['prueba', 'pregunta', 'parte', 'clave', 'n', 'dificultad_p', 'p_1er_anio', 'p_2do_anio', 'p_3er_anio', 'p_4to_anio', 'p_5to_anio',
    'omision', 'discriminacion_D27', 'r_pbis_corregida', '%A', '%B', '%C', '%D', '%E'];
  var salida = [enc];

  Object.keys(ESPECIFICACION).forEach(function (prueba) {
    var spec = ESPECIFICACION[prueba];
    var filas = intentos.filter(function (f) { return f[iPrueba] === prueba; }).map(function (f) {
      var cad = String(f[iCadena]);
      var resp = [];
      for (var i = 0; i < spec.items; i++) resp.push(cad.charAt(i) === '-' ? null : cad.charAt(i));
      var aciertos = resp.map(function (x, i) { return x === CLAVE[prueba][i] ? 1 : 0; });
      return { anio: String(f[iAnio]), resp: resp, aciertos: aciertos, total: aciertos.reduce(function (a, b) { return a + b; }, 0) };
    });
    var n = filas.length;
    var orden = filas.slice().sort(function (a, b) { return b.total - a.total; });
    var k = Math.max(1, Math.round(n * 0.27));
    var sup = orden.slice(0, k), inf = orden.slice(n - k);

    for (var i = 0; i < spec.items; i++) {
      var fila = [prueba, i + 1, spec.parte(i + 1), CLAVE[prueba][i], n];
      if (!n) { while (fila.length < enc.length) fila.push(''); salida.push(fila); continue; }
      var p = media_(filas.map(function (f) { return f.aciertos[i]; }));
      var pAnio = ['1', '2', '3', '4', '5'].map(function (a) {
        var sub = filas.filter(function (f) { return f.anio === a; });
        return sub.length ? redondear_(media_(sub.map(function (f) { return f.aciertos[i]; }))) : '';
      });
      var om = media_(filas.map(function (f) { return f.resp[i] === null ? 1 : 0; }));
      var D = n >= 4
        ? media_(sup.map(function (f) { return f.aciertos[i]; })) - media_(inf.map(function (f) { return f.aciertos[i]; }))
        : '';
      var rpb = correlacion_(filas.map(function (f) { return f.aciertos[i]; }),
        filas.map(function (f) { return f.total - f.aciertos[i]; }));
      var dist = 'ABCDE'.split('').map(function (L) {
        if (spec.opciones(i + 1).indexOf(L) < 0) return '';
        return redondear_(media_(filas.map(function (f) { return f.resp[i] === L ? 1 : 0; })));
      });
      salida.push(fila.concat([redondear_(p)], pAnio, [redondear_(om), D === '' ? '' : redondear_(D),
        rpb === null ? '' : redondear_(rpb)], dist));
    }
  });

  var h = ss.getSheetByName(HOJA_ANALISIS) || ss.insertSheet(HOJA_ANALISIS);
  h.clear();
  h.getRange(1, 1, salida.length, enc.length).setValues(salida);
  h.setFrozenRows(1);
  h.getRange(1, 1, 1, enc.length).setFontWeight('bold').setBackground('#e8eef7');
  avisar_('Análisis generado en "' + HOJA_ANALISIS + '" (' + intentos.length + ' intentos considerados).');
}

function media_(xs) { return xs.length ? xs.reduce(function (a, b) { return a + b; }, 0) / xs.length : 0; }
function redondear_(x) { return Math.round(x * 1000) / 1000; }
function correlacion_(xs, ys) {
  var mx = media_(xs), my = media_(ys), sxy = 0, sxx = 0, syy = 0;
  for (var i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my); sxx += Math.pow(xs[i] - mx, 2); syy += Math.pow(ys[i] - my, 2);
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

function avisar_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* ejecución sin interfaz */ }
}
