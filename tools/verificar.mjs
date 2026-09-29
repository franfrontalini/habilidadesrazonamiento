// Verificación automática del proyecto (sin dependencias).
// Uso: node tools/verificar.mjs
//
// 1. Los tres cuestionarios tienen exactamente 20, 12 y 17 ítems, numerados
//    en orden y con las opciones que espera el servidor.
// 2. La clave del servidor (Clave.gs) coincide con la extraída del PDF
//    (tools/clave_pdf.json, generado por tools/extraer_clave_pdf.py).
// 3. La clave no llega al navegador.
// 4. No se registran datos identificatorios (frontend, esquema y columnas).
// 5. Envío de punta a punta contra una hoja simulada en memoria: corrección
//    en el servidor, cada respuesta vinculada a su intento y sin duplicados.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { randomUUID, createHmac } from 'node:crypto';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => readFileSync(join(raiz, p), 'utf8');

let fallas = 0, pasos = 0;
function check(cond, msg) {
  pasos++;
  if (cond) console.log('  ✓ ' + msg);
  else { fallas++; console.log('  ✗ ' + msg); }
}
function seccion(t) { console.log('\n' + t); }

/* ---------- Cargar contenido del cliente y código del servidor ---------- */
const ctxCliente = { window: {} };
vm.runInNewContext(leer('web/items.js'), ctxCliente);
const ITEMS = ctxCliente.window.ADM_ITEMS;

// Hoja de cálculo simulada para ejecutar Code.gs tal cual.
function crearMocks() {
  const hojas = {};
  function hoja(nombre) {
    const filas = [];
    return {
      filas,
      getLastRow: () => filas.length,
      getLastColumn: () => Math.max(0, ...filas.map((f) => f.length)),
      appendRow: (f) => { filas.push(f.slice()); },
      clear: () => { filas.length = 0; },
      setFrozenRows() {},
      getRange(r, c, nr = 1, nc = 1) {
        if (typeof r === 'string') { c = 1; nr = filas.length; nc = 1; r = 1; }
        const rango = {
          setFontWeight: () => rango, setBackground: () => rango,
          getValues: () => Array.from({ length: nr }, (_, i) =>
            Array.from({ length: nc }, (_, j) => (filas[r - 1 + i] || [])[c - 1 + j] ?? '')),
          setValues(vals) {
            vals.forEach((f, i) => {
              const fila = filas[r - 1 + i] || (filas[r - 1 + i] = []);
              f.forEach((v, j) => { fila[c - 1 + j] = v; });
            });
          },
          createTextFinder(txt) {
            let entera = false;
            const tf = {
              matchEntireCell(v) { entera = v; return tf; },
              findNext() {
                for (let i = 0; i < nr; i++) {
                  const v = String((filas[r - 1 + i] || [])[c - 1] ?? '');
                  if (entera ? v === txt : v.includes(txt)) return { getRow: () => r + i };
                }
                return null;
              }
            };
            return tf;
          }
        };
        return rango;
      },
      getDataRange() { return this.getRange(1, 1, filas.length, this.getLastColumn()); }
    };
  }
  const libro = {
    getSheetByName: (n) => hojas[n] || null,
    insertSheet: (n) => (hojas[n] = hoja(n))
  };
  const cache = new Map();
  return {
    hojas, libro,
    globals: {
      SpreadsheetApp: { openById: () => libro, getActiveSpreadsheet: () => libro, flush() {}, getUi() { throw new Error('sin UI'); } },
      CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k) }) },
      LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
      PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'mock', setProperty() {} }) },
      Utilities: {
        getUuid: () => randomUUID(),
        computeHmacSha256Signature: (v, k) => Array.from(createHmac('sha256', k).update(v).digest()).map((b) => (b > 127 ? b - 256 : b)),
        base64EncodeWebSafe: (bytes) => Buffer.from(bytes.map((b) => b & 255)).toString('base64url')
      },
      Logger: { log() {} },
      Session: new Proxy({}, { get() { throw new Error('El servidor intentó leer la sesión del usuario'); } })
    }
  };
}
const mocks = crearMocks();
const srv = vm.createContext({ ...mocks.globals, console });
if (!existsSync(join(raiz, 'apps-script/Clave.gs'))) {
  console.error('Falta apps-script/Clave.gs (no se versiona). Copiá apps-script/Clave.example.gs como Clave.gs y cargá la clave del PDF.');
  process.exit(1);
}
vm.runInContext(leer('apps-script/Clave.gs'), srv, { filename: 'Clave.gs' });
vm.runInContext(leer('apps-script/Code.gs'), srv, { filename: 'Code.gs' });
const S = (expr) => vm.runInContext(expr, srv);

const ESPERADO = { cuantitativo: 20, ludico: 12, verbal: 17 };

/* ---------- 1. Estructura ---------- */
seccion('1. Estructura de los cuestionarios');
check(JSON.stringify(ITEMS.orden) === JSON.stringify(Object.keys(ESPERADO)), 'Orden de las pruebas: cuantitativo, lúdico, verbal');
check(ITEMS.version === S('VERSION_PRUEBAS'), `Versión de contenido igual en cliente y servidor (${ITEMS.version})`);
for (const [id, n] of Object.entries(ESPERADO)) {
  const t = ITEMS.pruebas[id];
  const spec = S(`ESPECIFICACION.${id}`);
  check(t.items.length === n, `${id}: ${t.items.length} ítems (esperado ${n})`);
  check(spec.items === n, `${id}: el servidor espera ${spec.items} ítems`);
  check(t.items.every((it, i) => it.n === i + 1), `${id}: numeración 1..${n} en orden`);
  const malOpc = t.items.filter((it) => it.opciones.map((o) => o.key).join('') !== spec.opciones(it.n));
  check(!malOpc.length, `${id}: opciones de cada ítem coinciden con el servidor` + (malOpc.length ? ` (difieren: ${malOpc.map((i) => i.n)})` : ''));
  const malParte = t.items.filter((it) => it.parte && it.parte !== spec.parte(it.n));
  check(!malParte.length, `${id}: partes coinciden con el servidor`);
  const sinGrupo = t.items.filter((it) => it.grupo && !t.grupos[it.grupo]);
  check(!sinGrupo.length, `${id}: todo ítem con material referencia un grupo existente`);
  check(t.minutos === spec.minutos, `${id}: tiempo de referencia ${t.minutos} min`);
  const vacios = t.items.filter((it) => it.opciones.some((o) => !String(o.html).trim()) || !(it.enunciado || it.cantidadA));
  check(!vacios.length, `${id}: ningún enunciado u opción vacío`);
}
check(ITEMS.pruebas.ludico.items.slice(0, 5).every((i) => i.grupo === 'futbol') &&
  ITEMS.pruebas.ludico.items.slice(5).every((i) => i.grupo === 'oficinas'), 'lúdico: reglas asociadas a las preguntas 1–5 y 6–12');
const gv = ITEMS.pruebas.verbal.items.map((i) => i.grupo || '-').join(',');
check(gv === 'piel,piel,piel,piel,tolstoi,tolstoi,tolstoi,tolstoi,tolstoi,tolstoi,tolstoi,-,serpientes,serpientes,-,-,-',
  'verbal: textos asociados a 1–4, 5–11 y 13–14');

/* ---------- 2. Clave vs PDF ---------- */
seccion('2. Clave de respuestas vs. PDF');
const rutaPdf = join(raiz, 'tools/clave_pdf.json');
if (!existsSync(rutaPdf)) {
  check(false, 'Falta tools/clave_pdf.json: ejecutá tools/extraer_clave_pdf.py con el PDF');
} else {
  const pdf = JSON.parse(readFileSync(rutaPdf, 'utf8'));
  for (const [id, n] of Object.entries(ESPERADO)) {
    const clave = S(`CLAVE.${id}`);
    check(clave.length === n, `${id}: la clave tiene ${clave.length} respuestas`);
    const dif = clave.map((k, i) => (k !== pdf[id][i] ? `${i + 1}: servidor ${k} / PDF ${pdf[id][i]}` : null)).filter(Boolean);
    check(!dif.length && pdf[id].length === n, `${id}: coincide con el PDF (${clave.join('')})` + (dif.length ? ' — ' + dif.join('; ') : ''));
    const spec = S(`ESPECIFICACION.${id}`);
    check(clave.every((k, i) => spec.opciones(i + 1).includes(k)), `${id}: cada respuesta correcta es una opción válida del ítem`);
  }
}

// La plantilla pública debe tener la misma estructura y ninguna respuesta.
const plantilla = vm.createContext({});
vm.runInContext(leer('apps-script/Clave.example.gs'), plantilla);
check(vm.runInContext('VERSION_PRUEBAS', plantilla) === S('VERSION_PRUEBAS') &&
  Object.keys(ESPERADO).every((id) => {
    const a = vm.runInContext(`ESPECIFICACION.${id}`, plantilla), b = S(`ESPECIFICACION.${id}`);
    return a.items === b.items && a.minutos === b.minutos &&
      Array.from({ length: a.items }, (_, i) => a.opciones(i + 1) + a.parte(i + 1)).join() ===
      Array.from({ length: b.items }, (_, i) => b.opciones(i + 1) + b.parte(i + 1)).join();
  }), 'Clave.example.gs tiene la misma versión y especificación que Clave.gs');
check(Object.keys(ESPERADO).every((id) => vm.runInContext(`CLAVE.${id}`, plantilla).every((k) => k === '?')),
  'Clave.example.gs no contiene respuestas');

/* ---------- 3. La clave no llega al navegador ---------- */
seccion('3. La clave no se expone al navegador');
const cliente = ['web/items.js', 'web/app.js', 'web/index.html'].map(leer).join('\n') +
  (existsSync(join(raiz, 'apps-script/Index.html')) ? leer('apps-script/Index.html') : '');
for (const id of Object.keys(ESPERADO)) {
  const cadena = S(`CLAVE.${id}`).join('');
  check(!cliente.includes(cadena) && !cliente.includes(JSON.stringify(S(`CLAVE.${id}`))), `${id}: la secuencia de la clave no aparece en el código del cliente`);
}
check(!/correcta\s*:|clave\s*:|respuestaCorrecta/i.test(leer('web/items.js')), 'items.js no tiene campos de respuesta correcta');
const cfgPublica = JSON.stringify(S('apiConfig()'));
check(!Object.keys(ESPERADO).some((id) => cfgPublica.includes(S(`CLAVE.${id}`).join(''))), 'apiConfig() no devuelve la clave');
check(!/codigo/i.test(cfgPublica), 'apiConfig() no devuelve los códigos de acceso');
check(/\bcreateHtmlOutputFromFile\('Index'\)/.test(leer('apps-script/Code.gs')), 'La hoja no se publica: el web app solo sirve Index.html');

/* ---------- 4. Privacidad ---------- */
seccion('4. Sin datos identificatorios');
const htmlApp = leer('web/index.html') + leer('web/app.js');
const camposTexto = htmlApp.match(/<input[^>]+type=["']?(text|email|tel|number|password|search)[^>]*>/gi) || [];
check(camposTexto.length === 1 && /id="codigo-acceso"/.test(camposTexto[0]) && !/<textarea/i.test(htmlApp),
  'El único campo de texto es el código de acceso; el perfil usa solo opciones cerradas');
const appJs = leer('web/app.js');
check((appJs.match(/codigo: codigo/g) || []).length === 1 && !/codigo/i.test(/var payload = \{([\s\S]*?)\};/.exec(appJs)[1]) &&
  !/codigo/i.test(/var intento = \{([\s\S]*?)\};/.exec(appJs)[1]),
  'El código de acceso solo viaja al iniciar: no se guarda en el intento ni se envía con la entrega');
check(!S('COLUMNAS_INTENTOS').concat(S('COLUMNAS_RESPUESTAS')).some((c) => /codigo|token/.test(c)), 'Ni el código ni el token se guardan en la hoja');
const code = leer('apps-script/Code.gs');
check(!/Session\.get(Active|Effective)User\s*\(|getEmail\s*\(|getTemporaryActiveUserKey/.test(code), 'El servidor no lee usuario, correo ni clave de usuario');
const prohibidos = /(nombre|apellido|legajo|dni|documento|correo|email|mail|telefono|usuario|\bip\b)/i;
check(!S('COLUMNAS_INTENTOS').some((c) => prohibidos.test(c)), 'Columnas de "Intentos" sin campos identificatorios');
check(!S('COLUMNAS_RESPUESTAS').some((c) => prohibidos.test(c)), 'Columnas de "Respuestas" sin campos identificatorios');
check(JSON.stringify(S('CLAVES_PERFIL')) === '["anio","especialidad","condicion"]', 'El perfil solo admite año, especialidad y condición');
const payloadCliente = /var payload = \{([\s\S]*?)\};/.exec(leer('web/app.js'))[1].match(/^\s*(\w+):/gm).map((s) => s.trim().slice(0, -1));
check(JSON.stringify(payloadCliente) === JSON.stringify(S('CLAVES_ENTREGA')), `El cliente envía exactamente los campos del esquema (${payloadCliente.join(', ')})`);
const especialidades = S('ESPECIALIDADES_POR_DEFECTO');
check(especialidades.every((e) => leer('web/app.js').includes(`'${e}'`)), 'Lista de carreras del modo demo igual a la del servidor');

/* ---------- 5. Validación y corrección (lógica pura) ---------- */
seccion('5. Validación y corrección en el servidor');
const cfg = S('normalizarConfig_({})');
check(cfg.mostrar_porcentaje === true && !('mostrar_correccion' in cfg) && !('mostrar_puntaje' in cfg), 'Por defecto se muestra solo el % de aciertos; no existe opción de mostrar corrección');
check(JSON.stringify(S('PERFIL_ANIOS')) === '["1","2","3","4","5","otro"]', 'Años de cursado: 1.º a 5.º y otro');
check(!/Aeronáutica|Textil|Naval|Pesquera|Telecomunicaciones|Ferroviaria/.test(S('ESPECIALIDADES_POR_DEFECTO').join('|') + appJs),
  'Carreras eliminadas: Aeronáutica, Textil, Naval, Pesquera, Telecomunicaciones y Ferroviaria');
check(cfg.codigo_cuantitativo === '' , 'Sin código configurado no se puede iniciar (se generan al configurar hojas)');
check(cfg.minutos_cuantitativo === 45 && cfg.minutos_ludico === 30 && cfg.minutos_verbal === 40, 'Tiempos por defecto 45 / 30 / 40 min');
const base = (prueba, respuestas) => {
  const idIntento = randomUUID();
  return {
    idIntento, prueba, version: ITEMS.version, token: S(`firmarIntento_('${idIntento}', '${prueba}')`),
    perfil: { anio: '1', especialidad: especialidades[0], condicion: 'ingresante' },
    respuestas, duracionClienteSeg: 100, finalizacion: 'entregado'
  };
};
srv.__cfg = cfg;
const validar = (d) => { srv.__d = d; return S('validarEntrega_(__d, __cfg)'); };
for (const [id, n] of Object.entries(ESPERADO)) {
  const clave = S(`CLAVE.${id}`);
  srv.__r = clave.slice();
  const todo = S(`corregir_('${id}', __r)`);
  check(todo.puntaje === n && todo.porcentaje === 100 && todo.omitidas === 0, `${id}: todas correctas → ${n}/${n}, 100 %`);
  srv.__r = clave.map(() => null);
  const nada = S(`corregir_('${id}', __r)`);
  check(nada.puntaje === 0 && nada.omitidas === n && nada.detalle.length === n, `${id}: todas omitidas → 0 puntos, ${n} omitidas`);
  check(validar(base(id, clave.map(() => null))).ok, `${id}: entrega válida con omitidas es aceptada`);
  check(validar(base(id, clave.slice(0, n - 1))).error === 'cantidad_items_invalida', `${id}: se rechaza una entrega con ${n - 1} ítems`);
  check(validar(base(id, clave.concat(['A']))).error === 'cantidad_items_invalida', `${id}: se rechaza una entrega con ${n + 1} ítems`);
}
const c1 = S('CLAVE.cuantitativo').slice(); c1[0] = 'E';
check(validar(base('cuantitativo', c1)).error === 'opcion_invalida', 'Se rechaza la opción E en un ítem de 4 opciones (cuantitativo 1–10)');
const c2 = S('CLAVE.ludico').slice(); c2[3] = 'F';
check(validar(base('ludico', c2)).error === 'opcion_invalida', 'Se rechaza una opción inexistente (F)');
check(validar({ ...base('verbal', Array(17).fill(null)), prueba: 'matematica' }).error === 'prueba_invalida', 'Se rechaza una sección inexistente');
check(validar({ ...base('verbal', Array(17).fill(null)), correo: 'a@b.c' }).error === 'campos_no_permitidos', 'Se rechaza un campo extra (correo) en la entrega');
const conDni = base('verbal', Array(17).fill(null)); conDni.perfil.dni = '123';
check(validar(conDni).error === 'campos_no_permitidos', 'Se rechaza un campo extra (dni) en el perfil');
check(validar({ ...base('verbal', Array(17).fill(null)), idIntento: 'alumno-juan' }).error === 'id_invalido', 'Se rechaza un id que no sea UUID aleatorio');
check(validar({ ...base('verbal', Array(17).fill(null)), version: 'otra' }).error === 'version_invalida', 'Se rechaza una versión de contenido distinta');
const perfilMalo = base('verbal', Array(17).fill(null)); perfilMalo.perfil.anio = '6';
check(validar(perfilMalo).error === 'perfil_invalido', 'Se rechaza un año fuera de las opciones cerradas');

/* ---------- 6. Punta a punta con hoja simulada ---------- */
seccion('6. Envío de punta a punta (hoja simulada)');
const libro = mocks.libro;
const hc = libro.insertSheet('Configuración');
hc.appendRow(['parametro', 'valor', 'descripcion']);
const CODIGOS = { cuantitativo: 'Q7K2MX', ludico: 'L4P9RT', verbal: 'V3N8WZ' };
S('CONFIG_POR_DEFECTO').forEach((f) => hc.appendRow(/^codigo_/.test(f[0]) ? [f[0], CODIGOS[f[0].slice(7)], f[2]] : f));
libro.insertSheet('Intentos').appendRow(S('COLUMNAS_INTENTOS'));
libro.insertSheet('Respuestas').appendRow(S('COLUMNAS_RESPUESTAS'));
S("CacheService.getScriptCache().remove('config')"); // la config se leyó antes de crear la hoja

const envios = [];
for (const [id, n] of Object.entries(ESPERADO)) {
  const clave = S(`CLAVE.${id}`);
  // La mitad correcta, un cuarto omitidas, el resto incorrectas.
  const resp = clave.map((k, i) => (i < Math.floor(n / 2) ? k : i < Math.floor(n * 3 / 4) ? null : (k === 'A' ? 'B' : 'A')));
  const esperado = resp.filter((r, i) => r === clave[i]).length;
  const d = base(id, resp);
  srv.__d = { idIntento: d.idIntento, prueba: id, codigo: 'XXXXXX' };
  check(S('apiIniciar(__d)').error === 'codigo_invalido', `${id}: se rechaza un código de acceso incorrecto`);
  srv.__d = { idIntento: d.idIntento, prueba: id, codigo: CODIGOS[id === 'cuantitativo' ? 'ludico' : 'cuantitativo'] };
  check(S('apiIniciar(__d)').error === 'codigo_invalido', `${id}: se rechaza el código de otra prueba`);
  srv.__d = { idIntento: d.idIntento, prueba: id, codigo: ' ' + CODIGOS[id].toLowerCase() + ' ' };
  const ini = S('apiIniciar(__d)');
  check(ini.ok && ini.token === d.token, `${id}: el código correcto (sin distinguir mayúsculas) habilita el intento y devuelve su token`);
  srv.__d = { ...d, token: S(`firmarIntento_('${randomUUID()}', '${id}')`) };
  check(S('apiEntregar(__d)').error === 'token_invalido', `${id}: se rechaza una entrega con el token de otro intento`);
  srv.__d = d;
  const r = S('apiEntregar(__d)');
  envios.push({ id: d.idIntento, prueba: id, n, esperado, omitidas: resp.filter((x) => !x).length, d });
  check(r.ok && r.recibido && !r.duplicado, `${id}: entrega recibida`);
  const pct = Math.round(esperado / n * 1000) / 10;
  check(r.resultado && Object.keys(r.resultado).join() === 'porcentaje' && r.resultado.porcentaje === pct,
    `${id}: al estudiante se le devuelve solo el porcentaje (${pct} %), sin puntaje, ítems ni respuestas correctas`);
}
const intentos = mocks.hojas['Intentos'].filas.slice(1);
const respuestas = mocks.hojas['Respuestas'].filas.slice(1);
const col = (k) => S('COLUMNAS_INTENTOS').indexOf(k);
for (const e of envios) {
  const fila = intentos.find((f) => f[0] === e.id);
  check(!!fila, `${e.prueba}: intento guardado en "Intentos"`);
  check(fila[col('puntaje')] === e.esperado && fila[col('omitidas')] === e.omitidas && fila[col('total_items')] === e.n,
    `${e.prueba}: puntaje ${fila[col('puntaje')]}/${e.n} y ${fila[col('omitidas')]} omitidas calculados en el servidor`);
  check(fila[col('fuente_duracion')] === 'servidor', `${e.prueba}: duración medida por el servidor (inicio registrado)`);
  const suyas = respuestas.filter((f) => f[0] === e.id);
  check(suyas.length === e.n && suyas.map((f) => f[3]).join(',') === Array.from({ length: e.n }, (_, i) => i + 1).join(','),
    `${e.prueba}: ${suyas.length} filas en "Respuestas" vinculadas al intento, preguntas 1..${e.n}`);
  check(suyas.reduce((s, f) => s + f[6], 0) === e.esperado, `${e.prueba}: suma de aciertos en "Respuestas" = puntaje del intento`);
  check(fila[col('respuestas_cadena')].length === e.n, `${e.prueba}: respuestas_cadena con ${e.n} posiciones`);
}
// Duplicado: el mismo id no se registra dos veces y la corrección no depende del navegador.
const e0 = envios[0];
const trucho = { ...e0.d, respuestas: S('CLAVE.cuantitativo').slice() };
srv.__d = trucho;
const dup = S('apiEntregar(__d)');
check(dup.ok && dup.duplicado, 'Reenvío del mismo id detectado como duplicado');
check(mocks.hojas['Intentos'].filas.filter((f) => f[0] === e0.id).length === 1, 'El intento duplicado no genera una segunda fila');
check(mocks.hojas['Respuestas'].filas.filter((f) => f[0] === e0.id).length === e0.n, 'El duplicado no agrega respuestas');
// Política de devolución configurable.
hc.filas.find((f) => f[0] === 'mostrar_porcentaje')[1] = 'NO';
S("CacheService.getScriptCache().remove('config')");
srv.__d = base('ludico', S('CLAVE.ludico').slice());
const sinPct = S('apiEntregar(__d)');
check(sinPct.ok && sinPct.resultado === undefined, 'Con mostrar_porcentaje=NO solo se confirma la recepción');
check(!/detalle|correcta/.test(leer('apps-script/Code.gs').split('function respuestaRecepcion_')[1].split('\n}')[0]),
  'La respuesta al estudiante nunca incluye detalle por ítem ni respuestas correctas');
// Sin campos identificatorios en lo guardado.
const guardado = JSON.stringify(mocks.hojas['Intentos'].filas) + JSON.stringify(mocks.hojas['Respuestas'].filas);
check(!/@|juan|dni/i.test(guardado), 'Lo guardado no contiene correos ni datos personales');
srv.__x = null;
const audit = S('auditarDatos()');
check(/^Auditoría OK/.test(audit), 'auditarDatos(): ' + audit.split('\n')[0]);

S('generarAnalisisItems()');
const an = mocks.hojas['Análisis_ítems'].filas;
const anCuant = an.filter((f) => f[0] === 'cuantitativo');
check(an.length === 1 + 20 + 12 + 17 && anCuant[0][4] === 1 && anCuant[0][5] === 1 && anCuant[19][11] === 0 && an[0].includes('p_2do_anio') && an[0].includes('p_4to_anio'),
  'generarAnalisisItems(): una fila por ítem (49), excluye es_prueba y calcula dificultad/omisión');

/* ---------- Revisión humana ---------- */
seccion('Puntos de transcripción marcados para revisión docente');
for (const id of ITEMS.orden) {
  const t = ITEMS.pruebas[id];
  for (const [g, gr] of Object.entries(t.grupos)) if (gr.revision) console.log(`  • ${id} / ${g}: ${gr.revision}`);
  for (const it of t.items) if (it.revision) console.log(`  • ${id} ${it.n}: ${it.revision}`);
}

console.log(`\n${pasos - fallas}/${pasos} verificaciones OK` + (fallas ? ` — ${fallas} FALLARON` : ''));
process.exit(fallas ? 1 : 0);
