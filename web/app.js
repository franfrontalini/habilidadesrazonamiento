/*
 * Aplicación del estudiante: perfil anónimo, instrucciones, prueba con
 * temporizador, revisión y entrega. No calcula puntajes: la corrección se
 * hace en el servidor (Apps Script) con una clave que el navegador no ve.
 */
(function () {
  'use strict';

  var DATA = window.ADM_ITEMS;
  var PREFIJO = 'admtest:v1:';
  var AVISOS_SEG = [300, 60];

  var PERFIL_TEXTOS = {
    anios: { '1': '1.º año', '2': '2.º año', '3': '3.º año', '4': '4.º año', '5': '5.º año', otro: 'Otro' },
    condiciones: { ingresante: 'Ingresante', regular: 'Estudiante regular', proximo_a_egresar: 'Próximo a egresar' }
  };

  // Valores usados solo en modo demostración; con servidor manda apiConfig().
  var CONFIG_DEMO = {
    ok: true,
    version: DATA.version,
    recepcionAbierta: true,
    mostrarPorcentaje: true,
    pruebas: {
      cuantitativo: { habilitada: true, minutos: 45, items: 20 },
      ludico: { habilitada: true, minutos: 30, items: 12 },
      verbal: { habilitada: true, minutos: 40, items: 17 }
    },
    perfil: {
      anios: ['1', '2', '3', '4', '5', 'otro'],
      condiciones: ['ingresante', 'regular', 'proximo_a_egresar'],
      especialidades: [
        'Ingeniería Civil', 'Ingeniería Eléctrica', 'Ingeniería Electromecánica',
        'Ingeniería Electrónica', 'Ingeniería Industrial', 'Ingeniería Mecánica',
        'Ingeniería Metalúrgica', 'Ingeniería Química',
        'Ingeniería en Sistemas de Información', 'Otra'
      ]
    }
  };

  var app = document.getElementById('app');
  var estado = { config: null, perfil: null, intento: null, timer: null, avisados: {} };

  /* ================================================================
   * Almacenamiento local (tolerante a fallos)
   * ============================================================== */
  function leer(store, k) {
    try { var v = store.getItem(PREFIJO + k); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function guardar(store, k, v) {
    try { store.setItem(PREFIJO + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ }
  }
  function borrar(store, k) {
    try { store.removeItem(PREFIJO + k); } catch (e) { /* sin almacenamiento */ }
  }
  var local = safeStore('localStorage');
  var sesion = safeStore('sessionStorage');
  function safeStore(nombre) {
    try { return window[nombre]; } catch (e) { return { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} }; }
  }

  // Intento en curso: persiste en localStorage para sobrevivir a recargas o cortes.
  function guardarIntento() { if (estado.intento) guardar(local, 'intento', estado.intento); }
  function borrarIntento() { borrar(local, 'intento'); estado.intento = null; }

  /* ================================================================
   * Transporte hacia el servidor
   * ============================================================== */
  var endpointMeta = document.querySelector('meta[name="adm-endpoint"]');
  var ENDPOINT = endpointMeta ? endpointMeta.content.trim() : '';
  var MODO = (window.google && google.script && google.script.run) ? 'gas' : (ENDPOINT ? 'fetch' : 'demo');

  var api = {
    config: function () { return llamar('apiConfig', 'config', null); },
    iniciar: function (d) { return llamar('apiIniciar', 'iniciar', d); },
    entregar: function (d) { return llamar('apiEntregar', 'entregar', d); }
  };
  function llamar(fn, accion, data) {
    if (MODO === 'gas') {
      return new Promise(function (ok, fallo) {
        var r = google.script.run.withSuccessHandler(ok).withFailureHandler(fallo);
        if (data === null) r[fn](); else r[fn](data);
      });
    }
    if (MODO === 'fetch') {
      // text/plain evita el preflight CORS; Apps Script responde JSON.
      return fetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ action: accion, data: data }), redirect: 'follow' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    }
    // Modo demostración: no se envía nada.
    return new Promise(function (ok) {
      setTimeout(function () {
        if (accion === 'config') ok(CONFIG_DEMO);
        else if (accion === 'iniciar') ok(data.codigo.trim() ? { ok: true, demo: true, token: 'demo' } : { ok: false, error: 'codigo_invalido' });
        else ok({ ok: true, recibido: true, demo: true, idIntento: data.idIntento, resultado: { porcentaje: '—' } });
      }, 250);
    });
  }

  /* ================================================================
   * Utilidades
   * ============================================================== */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uuidv4() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return (x + 0x100).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function mmss(seg) {
    seg = Math.max(0, Math.ceil(seg));
    var m = Math.floor(seg / 60), s = seg % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function anunciar(txt, urgente) {
    var el = document.getElementById(urgente ? 'sr-alert' : 'sr-live');
    el.textContent = '';
    setTimeout(function () { el.textContent = txt; }, 50);
  }
  function enfocar(sel) {
    var el = typeof sel === 'string' ? app.querySelector(sel) : sel;
    if (el) { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: false }); }
  }
  function prueba(id) { return DATA.pruebas[id]; }
  function cfgPrueba(id) { return estado.config.pruebas[id]; }
  function codigoCorto(id) { return id.slice(0, 8).toUpperCase(); }
  function perfilCompleto(p) { return p && p.anio && p.especialidad && p.condicion; }
  function textoError(e) {
    var codigos = {
      recepcion_cerrada: 'La recepción de pruebas está cerrada en este momento.',
      prueba_deshabilitada: 'Esta prueba no está habilitada en este momento.',
      ya_entregado: 'Este intento ya fue entregado.',
      codigo_invalido: 'El código de acceso no es correcto. Pedíselo al equipo docente.',
      codigo_no_configurado: 'Esta prueba todavía no tiene código de acceso configurado. Avisale al equipo docente.',
      token_invalido: 'El intento no fue habilitado con un código de acceso válido.',
      servidor_ocupado: 'El servidor está ocupado. Probá de nuevo en unos segundos.'
    };
    if (e && e.error && codigos[e.error]) return codigos[e.error];
    if (e && e.error) return 'El servidor rechazó el envío (' + e.error + (e.detalle ? ': ' + e.detalle : '') + ').';
    return 'No se pudo conectar con el servidor. Revisá tu conexión.';
  }

  /* ================================================================
   * Diálogo accesible
   * ============================================================== */
  function dialogo(titulo, cuerpoHtml, botones, opciones) {
    var dlg = document.getElementById('dlg');
    document.getElementById('dlg-title').textContent = titulo;
    document.getElementById('dlg-body').innerHTML = cuerpoHtml;
    var cont = document.getElementById('dlg-actions');
    cont.innerHTML = '';
    botones.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ' + (b.clase || '');
      btn.textContent = b.texto;
      btn.addEventListener('click', function () { cerrarDialogo(); if (b.accion) b.accion(); });
      cont.appendChild(btn);
    });
    dlg.oncancel = function (ev) { if (opciones && opciones.bloqueante) ev.preventDefault(); };
    if (dlg.open) dlg.close();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    var foco = cont.querySelector('.btn:not(.secondary)') || cont.firstChild;
    if (foco) foco.focus();
  }
  function cerrarDialogo() {
    var dlg = document.getElementById('dlg');
    if (dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  }

  /* ================================================================
   * Vista: inicio (propósito, privacidad, perfil y elección de prueba)
   * ============================================================== */
  function vistaInicio() {
    detenerTimer();
    window.onbeforeunload = null;
    app.onchange = null;
    var c = estado.config;
    var p = estado.perfil || {};
    var pendiente = leer(local, 'intento');

    var html = '<h1>Diagnóstico de razonamiento</h1>' +
      '<div class="notice"><p><strong>¿Para qué es?</strong> Estas pruebas se usan con fines diagnósticos, para conocer cómo razonan estudiantes de Ingeniería de la UTN en distintos momentos de la carrera. <strong>No son evaluaciones de ninguna materia ni afectan tu condición académica.</strong></p>' +
      '<p><strong>Es anónimo.</strong> No pedimos nombre, legajo, DNI ni correo, y no hace falta iniciar sesión. Solo registramos tu año, carrera y condición académica, tus respuestas y el tiempo empleado. Cada intento se identifica con un código aleatorio. Los resultados se analizan de forma agregada.</p></div>';

    if (!c.recepcionAbierta) {
      html += '<div class="notice warn"><p>La recepción de pruebas está cerrada en este momento.</p></div>';
    }

    if (pendiente) {
      var pp = prueba(pendiente.prueba);
      html += '<div class="notice warn" id="pendiente"><p><strong>Hay una prueba sin terminar en este dispositivo:</strong> ' + esc(pp.titulo) + '.</p>' +
        (pendiente.estado === 'pendiente'
          ? '<p>Ya la entregaste, pero el envío no se completó. Reintentá el envío.</p><div class="actions"><button class="btn" data-accion="reenviar">Reintentar envío</button></div>'
          : '<p>El tiempo sigue corriendo desde que comenzó.</p><div class="actions"><button class="btn" data-accion="continuar">Continuar la prueba</button></div>') +
        '</div>';
    }

    html += '<section class="card" aria-labelledby="perfil-h"><h2 id="perfil-h" style="margin-top:0">Tus datos de perfil</h2>' +
      '<p class="muted">Solo estos tres datos, para analizar resultados por grupo.</p>' +
      '<fieldset><legend>Año de cursado</legend><div class="choice-row">' +
      c.perfil.anios.map(function (a) {
        return '<label class="chip"><input type="radio" name="anio" value="' + esc(a) + '"' + (p.anio === a ? ' checked' : '') + '><span>' + esc(PERFIL_TEXTOS.anios[a] || a) + '</span></label>';
      }).join('') + '</div></fieldset>' +
      '<fieldset><legend><label for="especialidad">Especialidad o carrera de Ingeniería</label></legend>' +
      '<select id="especialidad" name="especialidad"><option value="">Elegí una opción</option>' +
      c.perfil.especialidades.map(function (e) {
        return '<option' + (p.especialidad === e ? ' selected' : '') + '>' + esc(e) + '</option>';
      }).join('') + '</select></fieldset>' +
      '<fieldset><legend>Condición académica</legend><div class="choice-row">' +
      c.perfil.condiciones.map(function (k) {
        return '<label class="chip"><input type="radio" name="condicion" value="' + esc(k) + '"' + (p.condicion === k ? ' checked' : '') + '><span>' + esc(PERFIL_TEXTOS.condiciones[k] || k) + '</span></label>';
      }).join('') + '</div></fieldset>' +
      '<p id="perfil-estado" class="muted" aria-live="polite"></p></section>';

    html += '<section aria-labelledby="pruebas-h"><h2 id="pruebas-h">Elegí una prueba</h2>' +
      '<p class="muted">Son tres pruebas independientes. Podés hacerlas en el orden que indique el equipo docente.</p><div class="tests">' +
      DATA.orden.map(function (id) {
        var t = prueba(id), cp = cfgPrueba(id);
        var hecha = (leer(sesion, 'hechas') || []).indexOf(id) >= 0;
        return '<article class="card test-card"><h3>' + esc(t.titulo) + '</h3>' +
          '<p class="meta">' + cp.items + ' preguntas · ' + cp.minutos + ' minutos</p>' +
          '<p class="resumen">' + esc(t.resumen) + '</p>' +
          (hecha ? '<p><span class="badge">Entregada en esta sesión</span></p>' : '') +
          (!cp.habilitada ? '<p><span class="badge warn">No habilitada</span></p>' : '') +
          '<div class="actions"><button class="btn" data-accion="abrir" data-prueba="' + id + '"' +
          (!cp.habilitada || !c.recepcionAbierta ? ' disabled' : '') + '>Ingresar</button></div></article>';
      }).join('') + '</div></section>';

    if ((leer(sesion, 'hechas') || []).length) {
      html += '<div class="actions"><button class="btn secondary" data-accion="terminar">Terminé: borrar mis datos de perfil de este dispositivo</button></div>';
    }

    app.innerHTML = html;

    function actualizarPerfil() {
      var anio = app.querySelector('input[name=anio]:checked');
      var cond = app.querySelector('input[name=condicion]:checked');
      estado.perfil = {
        anio: anio ? anio.value : '',
        especialidad: app.querySelector('#especialidad').value,
        condicion: cond ? cond.value : ''
      };
      guardar(sesion, 'perfil', estado.perfil);
      app.querySelector('#perfil-estado').textContent = perfilCompleto(estado.perfil)
        ? 'Perfil completo.' : 'Completá los tres datos para poder ingresar a una prueba.';
    }
    app.querySelectorAll('input[name=anio], input[name=condicion], #especialidad').forEach(function (el) {
      el.addEventListener('change', actualizarPerfil);
    });
    actualizarPerfil();

    app.onclick = function (ev) {
      var b = ev.target.closest('button[data-accion]');
      if (!b) return;
      var acc = b.getAttribute('data-accion');
      if (acc === 'abrir') {
        if (!perfilCompleto(estado.perfil)) {
          app.querySelector('#perfil-estado').textContent = 'Antes de ingresar, completá año, carrera y condición académica.';
          enfocar('#perfil-h');
          anunciar('Completá los datos de perfil antes de ingresar.', true);
          return;
        }
        if (leer(local, 'intento')) {
          dialogo('Hay una prueba sin terminar', '<p>Terminá o entregá la prueba en curso antes de empezar otra.</p>', [{ texto: 'Entendido' }]);
          return;
        }
        vistaInstrucciones(b.getAttribute('data-prueba'));
      } else if (acc === 'continuar') {
        estado.intento = leer(local, 'intento');
        vistaPrueba();
      } else if (acc === 'reenviar') {
        estado.intento = leer(local, 'intento');
        enviar();
      } else if (acc === 'terminar') {
        borrar(sesion, 'perfil'); borrar(sesion, 'hechas'); estado.perfil = null;
        vistaInicio();
        anunciar('Datos de perfil borrados de este dispositivo.');
      }
    };
    enfocar('h1');
  }

  /* ================================================================
   * Vista: instrucciones previas
   * ============================================================== */
  function vistaInstrucciones(id) {
    var t = prueba(id), cp = cfgPrueba(id), p = estado.perfil;
    var html = '<p><button class="btn ghost" data-accion="volver">← Volver</button></p>' +
      '<h1>' + esc(t.titulo) + '</h1>' +
      '<section class="card"><h2 style="margin-top:0">Propósito</h2><p>' + esc(t.proposito) + '</p>' +
      '<dl class="facts"><dt>Preguntas</dt><dd>' + cp.items + '</dd><dt>Tiempo</dt><dd>' + cp.minutos + ' minutos</dd>' +
      '<dt>Resultado</dt><dd>' + (estado.config.mostrarPorcentaje
        ? 'Al entregar verás tu porcentaje de aciertos (sin detalle por pregunta)'
        : 'Lo analiza el equipo docente') + '</dd></dl></section>' +
      '<section class="card"><h2 style="margin-top:0">Reglas</h2><ul>' +
      '<li>Cada pregunta tiene <strong>una sola respuesta correcta</strong>. Podés cambiar o borrar tu respuesta hasta entregar.</li>' +
      '<li>Las respuestas incorrectas y las preguntas sin responder no suman ni restan puntos.</li>' +
      '<li>Podés moverte libremente entre las preguntas y revisar todo antes de entregar. Te vamos a avisar cuáles quedaron sin responder; no se completan automáticamente.</li>' +
      t.reglasExtra.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') +
      '</ul></section>' +
      '<section class="card"><h2 style="margin-top:0">Tiempo</h2><ul>' +
      '<li>El temporizador empieza cuando tocás <strong>Comenzar</strong> y queda visible arriba durante toda la prueba.</li>' +
      '<li>El tiempo <strong>no se detiene</strong> si cerrás o recargás la página. Tus respuestas quedan guardadas en este dispositivo y podés continuar.</li>' +
      '<li>Te avisamos cuando queden 5 minutos y 1 minuto.</li>' +
      '<li><strong>Al agotarse el tiempo, la prueba se entrega automáticamente</strong> con las respuestas marcadas hasta ese momento. Las que no respondiste quedan como omitidas y ya no podrás modificar nada.</li>' +
      '</ul></section>' +
      '<section class="card"><h2 style="margin-top:0">Tu perfil</h2><dl class="facts">' +
      '<dt>Año</dt><dd>' + esc(PERFIL_TEXTOS.anios[p.anio]) + '</dd>' +
      '<dt>Carrera</dt><dd>' + esc(p.especialidad) + '</dd>' +
      '<dt>Condición</dt><dd>' + esc(PERFIL_TEXTOS.condiciones[p.condicion]) + '</dd></dl>' +
      '<p class="muted">Si algo no es correcto, volvé y cambialo antes de comenzar.</p></section>' +
      '<form class="card" id="form-codigo" novalidate><h2 style="margin-top:0"><label for="codigo-acceso">Código de acceso</label></h2>' +
      '<p class="muted" id="codigo-ayuda">Lo da el equipo docente al comenzar la toma. No distingue mayúsculas de minúsculas.' +
      (MODO === 'demo' ? ' En modo demostración sirve cualquier código.' : '') + '</p>' +
      '<input type="text" id="codigo-acceso" class="code-input" name="codigo" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" required aria-describedby="codigo-ayuda inst-error">' +
      '<p id="inst-error" class="form-error" role="alert"></p>' +
      '<div class="actions"><button type="submit" class="btn" id="btn-comenzar">Comenzar (' + cp.minutos + ' min)</button>' +
      '<button type="button" class="btn secondary" data-accion="volver">Volver</button></div></form>';
    app.innerHTML = html;
    app.onclick = function (ev) {
      if (ev.target.closest('button[data-accion=volver]')) vistaInicio();
    };
    var form = app.querySelector('#form-codigo');
    var campo = app.querySelector('#codigo-acceso');
    var error = app.querySelector('#inst-error');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var codigo = campo.value.trim();
      if (!codigo) {
        error.textContent = 'Ingresá el código de acceso para comenzar.';
        campo.setAttribute('aria-invalid', 'true');
        campo.focus();
        return;
      }
      var b = app.querySelector('#btn-comenzar');
      b.disabled = true;
      error.textContent = '';
      comenzar(id, codigo).catch(function (e) {
        b.disabled = false;
        campo.setAttribute('aria-invalid', 'true');
        error.textContent = textoError(e);
        campo.focus();
      });
    });
    enfocar('h1');
  }

  function comenzar(id, codigo) {
    var cp = cfgPrueba(id);
    var intento = {
      id: uuidv4(),
      prueba: id,
      version: DATA.version,
      perfil: { anio: estado.perfil.anio, especialidad: estado.perfil.especialidad, condicion: estado.perfil.condicion },
      limiteSeg: cp.minutos * 60,
      inicioMs: null,
      respuestas: prueba(id).items.map(function () { return null; }),
      actual: 0,
      estado: 'en_curso',
      finalizacion: null,
      duracionClienteSeg: null,
      token: null
    };
    // El servidor valida el código, registra la hora de inicio y devuelve un
    // token firmado que habilita la entrega. El código no se guarda.
    return api.iniciar({ idIntento: intento.id, prueba: id, codigo: codigo }).then(function (r) {
      if (!r || !r.ok || !r.token) throw r || {};
      intento.token = r.token;
      if (r.minutos) intento.limiteSeg = r.minutos * 60;
    }).then(function () {
      intento.inicioMs = Date.now();
      estado.intento = intento;
      estado.avisados = {};
      guardarIntento();
      vistaPrueba();
    });
  }

  /* ================================================================
   * Vista: prueba
   * ============================================================== */
  function restanteSeg() {
    var i = estado.intento;
    return i.limiteSeg - (Date.now() - i.inicioMs) / 1000;
  }

  function vistaPrueba() {
    var i = estado.intento;
    var t = prueba(i.prueba);
    if (restanteSeg() <= 0) return tiempoAgotado();

    app.innerHTML =
      '<div class="test-bar" role="region" aria-label="Estado de la prueba">' +
      '<span class="title">' + esc(t.titulo) + '</span>' +
      '<span class="progress" id="progreso"></span>' +
      '<span class="timer" id="timer" role="timer" aria-label="Tiempo restante"></span>' +
      '<button class="btn secondary" data-accion="revisar">Revisar y entregar</button></div>' +
      '<div id="pregunta-cont"></div>' +
      '<nav class="grid-nav" aria-label="Ir a una pregunta"><h2 class="sr-only">Preguntas</h2><ol id="grilla"></ol>' +
      '<div class="legend-keys" aria-hidden="true"><span class="k-ans">Respondida</span><span>Sin responder</span></div></nav>';

    app.onclick = function (ev) {
      var b = ev.target.closest('button[data-accion]');
      if (!b) return;
      var acc = b.getAttribute('data-accion');
      if (acc === 'revisar') vistaRevision();
      else if (acc === 'ir') irA(parseInt(b.getAttribute('data-n'), 10) - 1, true);
      else if (acc === 'ant') irA(i.actual - 1, true);
      else if (acc === 'sig') { if (i.actual === t.items.length - 1) vistaRevision(); else irA(i.actual + 1, true); }
      else if (acc === 'limpiar') { i.respuestas[i.actual] = null; guardarIntento(); pintarPregunta(false); anunciar('Respuesta borrada.'); }
      else if (acc === 'material') alternarMaterial(b);
    };
    app.onchange = function (ev) {
      if (ev.target.name === 'op') {
        i.respuestas[i.actual] = ev.target.value;
        guardarIntento();
        pintarGrilla();
        pintarProgreso();
        var lb = app.querySelector('[data-accion=limpiar]');
        if (lb) lb.disabled = false;
      }
    };

    pintarPregunta(true);
    iniciarTimer();
    window.onbeforeunload = function () { return 'La prueba sigue en curso.'; };
  }

  function irA(idx, foco) {
    var n = prueba(estado.intento.prueba).items.length;
    if (idx < 0 || idx >= n) return;
    estado.intento.actual = idx;
    guardarIntento();
    pintarPregunta(foco);
  }

  function pintarProgreso() {
    var i = estado.intento;
    var r = i.respuestas.filter(function (x) { return x; }).length;
    var el = document.getElementById('progreso');
    if (el) el.textContent = 'Respondidas ' + r + ' de ' + i.respuestas.length;
  }

  function pintarGrilla() {
    var i = estado.intento;
    document.getElementById('grilla').innerHTML = i.respuestas.map(function (r, k) {
      return '<li><button type="button" data-accion="ir" data-n="' + (k + 1) + '" class="' + (r ? 'answered' : '') + '"' +
        (k === i.actual ? ' aria-current="step"' : '') +
        ' aria-label="Pregunta ' + (k + 1) + (r ? ', respondida ' + r : ', sin responder') + '">' + (k + 1) + '</button></li>';
    }).join('');
  }

  function pintarPregunta(foco) {
    var i = estado.intento;
    var t = prueba(i.prueba);
    var it = t.items[i.actual];
    var total = t.items.length;
    var grupo = it.grupo ? t.grupos[it.grupo] : null;
    var parte = it.parte && t.partes[it.parte] ? t.partes[it.parte] : null;
    var consigna = parte ? parte.consigna : t.consigna;
    var tituloParte = parte ? parte.titulo : 'Consigna';
    var elegida = i.respuestas[i.actual];

    var cuerpo = '';
    if (it.cantidadA !== undefined) {
      cuerpo += (it.comun ? '<div class="common">' + it.comun + '</div>' : '') +
        '<table class="quantities"><caption class="sr-only">Cantidades a comparar</caption><thead><tr><th scope="col">Cantidad A</th><th scope="col">Cantidad B</th></tr></thead>' +
        '<tbody><tr><td>' + it.cantidadA + '</td><td>' + it.cantidadB + '</td></tr></tbody></table>';
    } else {
      cuerpo += '<div>' + it.enunciado + '</div>';
    }

    // El material (reglas o texto) se abre al entrar a un grupo nuevo.
    var anterior = i.actual > 0 ? t.items[i.actual - 1].grupo : null;
    var materialAbierto = grupo && (estado.materialAbierto === undefined || anterior !== it.grupo)
      ? true : !!estado.materialAbierto;
    if (grupo) estado.materialAbierto = materialAbierto;

    var material = grupo
      ? '<aside class="material" aria-labelledby="mat-h"><div class="material-head"><h2 id="mat-h">' + esc(grupo.titulo) + '</h2>' +
        '<button type="button" class="btn ghost material-toggle" data-accion="material" aria-controls="mat-body" aria-expanded="' + materialAbierto + '">' +
        (materialAbierto ? 'Ocultar ' : 'Ver ') + grupo.etiqueta + '</button></div>' +
        '<div class="material-body" id="mat-body"' + (materialAbierto ? '' : ' hidden') + '>' + grupo.html + '</div></aside>'
      : '';

    document.getElementById('pregunta-cont').innerHTML =
      '<div class="test-layout' + (grupo ? ' with-material' : '') + '">' + material +
      '<section class="question" aria-labelledby="q-h">' +
      '<details class="part-head"><summary>' + esc(tituloParte) + ' · ver consigna</summary><p class="consigna">' + consigna + '</p></details>' +
      '<fieldset><legend class="q-number" id="q-h" tabindex="-1">Pregunta ' + it.n + ' de ' + total + '</legend>' +
      '<div class="stem">' + cuerpo + '</div>' +
      '<div class="options">' + it.opciones.map(function (o) {
        var idOp = 'op-' + o.key;
        return '<label class="option" for="' + idOp + '"><input type="radio" name="op" id="' + idOp + '" value="' + o.key + '"' +
          (elegida === o.key ? ' checked' : '') + '><span class="letter">' + o.key + '.</span><span class="text">' + o.html + '</span></label>';
      }).join('') + '</div></fieldset>' +
      '<div class="q-nav"><button type="button" class="btn secondary" data-accion="ant"' + (i.actual === 0 ? ' disabled' : '') + '>← Anterior</button>' +
      '<button type="button" class="btn ghost" data-accion="limpiar"' + (elegida ? '' : ' disabled') + '>Borrar respuesta</button>' +
      '<button type="button" class="btn" data-accion="sig">' + (i.actual === total - 1 ? 'Ir a revisión →' : 'Siguiente →') + '</button></div>' +
      '</section></div>';

    pintarGrilla();
    pintarProgreso();
    if (foco) enfocar('#q-h');
  }

  function alternarMaterial(btn) {
    var body = document.getElementById('mat-body');
    var abrir = body.hasAttribute('hidden');
    if (abrir) body.removeAttribute('hidden'); else body.setAttribute('hidden', '');
    estado.materialAbierto = abrir;
    btn.setAttribute('aria-expanded', String(abrir));
    var g = prueba(estado.intento.prueba).grupos[prueba(estado.intento.prueba).items[estado.intento.actual].grupo];
    btn.textContent = (abrir ? 'Ocultar ' : 'Ver ') + g.etiqueta;
  }

  /* ================================================================
   * Temporizador
   * ============================================================== */
  function iniciarTimer() {
    detenerTimer();
    tick();
    estado.timer = setInterval(tick, 1000);
  }
  function detenerTimer() {
    if (estado.timer) clearInterval(estado.timer);
    estado.timer = null;
  }
  function tick() {
    var i = estado.intento;
    if (!i || i.estado !== 'en_curso') return detenerTimer();
    var r = restanteSeg();
    var el = document.getElementById('timer');
    if (el) {
      el.textContent = mmss(r);
      el.classList.toggle('warn', r <= 300 && r > 60);
      el.classList.toggle('danger', r <= 60);
    }
    AVISOS_SEG.forEach(function (s) {
      if (r <= s && r > 0 && !estado.avisados[s]) {
        estado.avisados[s] = true;
        anunciar('Atención: quedan ' + (s / 60) + (s === 60 ? ' minuto.' : ' minutos.'), true);
      }
    });
    if (r <= 0) tiempoAgotado();
  }

  function tiempoAgotado() {
    detenerTimer();
    var i = estado.intento;
    if (i.estado === 'en_curso') {
      i.estado = 'pendiente';
      i.finalizacion = 'tiempo_agotado';
      i.duracionClienteSeg = Math.min(i.limiteSeg, Math.round((Date.now() - i.inicioMs) / 1000));
      guardarIntento();
    }
    // La entrega sale sin esperar ninguna acción del estudiante.
    enviar();
    anunciar('Se agotó el tiempo. Tu prueba se está entregando.', true);
    dialogo('Se agotó el tiempo',
      '<p>La prueba se entregó automáticamente con las respuestas que marcaste. Las preguntas sin responder quedan como omitidas.</p>',
      [{ texto: 'Entendido' }]);
  }

  /* ================================================================
   * Vista: revisión antes de entregar
   * ============================================================== */
  function vistaRevision() {
    var i = estado.intento;
    var t = prueba(i.prueba);
    var faltan = [];
    i.respuestas.forEach(function (r, k) { if (!r) faltan.push(k + 1); });

    app.innerHTML =
      '<div class="test-bar" role="region" aria-label="Estado de la prueba">' +
      '<span class="title">' + esc(t.titulo) + ' · Revisión</span>' +
      '<span class="progress" id="progreso"></span>' +
      '<span class="timer" id="timer" role="timer" aria-label="Tiempo restante"></span></div>' +
      '<h1 tabindex="-1">Revisá tus respuestas</h1>' +
      (faltan.length
        ? '<div class="notice warn" role="status"><p><strong>Tenés ' + faltan.length + ' pregunta' + (faltan.length > 1 ? 's' : '') + ' sin responder:</strong> ' +
          faltan.map(function (n) { return '<button class="btn ghost" data-accion="ir" data-n="' + n + '">' + n + '</button>'; }).join(' ') +
          '</p><p>Si entregás así, quedarán como omitidas.</p></div>'
        : '<div class="notice" role="status"><p>Respondiste todas las preguntas.</p></div>') +
      '<div class="card review-wrap"><table class="review"><caption class="sr-only">Resumen de respuestas</caption>' +
      '<thead><tr><th scope="col">Pregunta</th><th scope="col">Tu respuesta</th><th scope="col"><span class="sr-only">Acción</span></th></tr></thead><tbody>' +
      i.respuestas.map(function (r, k) {
        return '<tr><td>' + (k + 1) + '</td><td class="' + (r ? '' : 'missing') + '">' + (r ? r : 'Sin responder') + '</td>' +
          '<td><button class="btn ghost" data-accion="ir" data-n="' + (k + 1) + '" aria-label="Ir a la pregunta ' + (k + 1) + '">Ir</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="actions"><button class="btn" data-accion="entregar">Entregar prueba</button>' +
      '<button class="btn secondary" data-accion="volver">Volver a la prueba</button></div>';

    app.onchange = null;
    app.onclick = function (ev) {
      var b = ev.target.closest('button[data-accion]');
      if (!b) return;
      var acc = b.getAttribute('data-accion');
      if (acc === 'volver') { vistaPrueba(); }
      else if (acc === 'ir') { i.actual = parseInt(b.getAttribute('data-n'), 10) - 1; guardarIntento(); vistaPrueba(); }
      else if (acc === 'entregar') confirmarEntrega(faltan);
    };
    pintarProgreso();
    iniciarTimer();
    enfocar('h1');
  }

  function confirmarEntrega(faltan) {
    var cuerpo = faltan.length
      ? '<p>Quedan <strong>' + faltan.length + '</strong> preguntas sin responder (' + faltan.join(', ') + '). Se registrarán como omitidas.</p><p>Después de entregar no vas a poder cambiar tus respuestas.</p>'
      : '<p>Después de entregar no vas a poder cambiar tus respuestas.</p>';
    dialogo('¿Entregar la prueba?', cuerpo, [
      { texto: 'Seguir revisando', clase: 'secondary' },
      { texto: 'Entregar', accion: function () {
        var i = estado.intento;
        if (i.estado !== 'en_curso') return;
        detenerTimer();
        i.estado = 'pendiente';
        i.finalizacion = 'entregado';
        i.duracionClienteSeg = Math.round((Date.now() - i.inicioMs) / 1000);
        guardarIntento();
        enviar();
      } }
    ]);
  }

  /* ================================================================
   * Envío y confirmación
   * ============================================================== */
  function enviar() {
    var i = estado.intento;
    window.onbeforeunload = null;
    app.onclick = null; app.onchange = null;
    app.innerHTML = '<h1 tabindex="-1">Enviando tus respuestas…</h1><p class="muted">No cierres esta página.</p>';
    enfocar('h1');
    var payload = {
      idIntento: i.id,
      prueba: i.prueba,
      version: i.version,
      token: i.token,
      perfil: i.perfil,
      respuestas: i.respuestas,
      duracionClienteSeg: i.duracionClienteSeg,
      finalizacion: i.finalizacion
    };
    api.entregar(payload).then(function (r) {
      if (!r || !r.ok) throw r || {};
      var hechas = leer(sesion, 'hechas') || [];
      if (hechas.indexOf(i.prueba) < 0) hechas.push(i.prueba);
      guardar(sesion, 'hechas', hechas);
      borrarIntento();
      vistaRecibido(i, r);
    }).catch(function (e) {
      app.innerHTML = '<h1 tabindex="-1">No pudimos completar el envío</h1>' +
        '<div class="notice danger"><p>' + esc(textoError(e)) + '</p>' +
        '<p>Tus respuestas están guardadas en este dispositivo. Podés reintentar ahora o más tarde desde la pantalla de inicio; no se registrarán dos veces.</p></div>' +
        '<div class="actions"><button class="btn" data-accion="reintentar">Reintentar envío</button>' +
        '<button class="btn secondary" data-accion="inicio">Ir al inicio</button></div>';
      app.onclick = function (ev) {
        var b = ev.target.closest('button[data-accion]');
        if (!b) return;
        if (b.getAttribute('data-accion') === 'reintentar') enviar(); else vistaInicio();
      };
      enfocar('h1');
    });
  }

  function vistaRecibido(i, r) {
    var t = prueba(i.prueba);
    var html = '<h1 tabindex="-1">¡Listo! Recibimos tus respuestas</h1>' +
      '<div class="notice" role="status"><p><strong>' + esc(t.titulo) + '</strong> entregada' +
      (i.finalizacion === 'tiempo_agotado' ? ' al agotarse el tiempo' : '') + '.</p>' +
      '<p>Código de intento: <strong>' + codigoCorto(i.id) + '</strong> <span class="muted">(anónimo; no está asociado a tu identidad)</span></p>' +
      (r.duplicado ? '<p class="muted">Este envío ya estaba registrado; no se duplicó.</p>' : '') +
      (r.demo ? '<p class="muted">Modo demostración: no se envió nada.</p>' : '') + '</div>';

    if (r.resultado) {
      // Solo el porcentaje global: nunca qué preguntas falló ni las respuestas correctas.
      html += '<section class="card result"><h2 style="margin-top:0">Tu resultado</h2>' +
        '<p class="result-pct"><span class="big">' + esc(String(r.resultado.porcentaje).replace('.', ',')) + ' %</span> de respuestas correctas</p>' +
        '<p class="muted">Por tratarse de un diagnóstico, no se informa qué preguntas fueron correctas ni cuáles eran las respuestas.</p>';
    } else {
      html += '<p>El equipo docente analizará los resultados de forma agregada y definirá cómo se hace la devolución.</p>';
    }
    html += '<div class="actions"><button class="btn" data-accion="inicio">Volver al inicio</button></div>';
    app.innerHTML = html;
    app.onclick = function (ev) { if (ev.target.closest('[data-accion=inicio]')) vistaInicio(); };
    enfocar('h1');
    anunciar('Prueba recibida.');
  }

  /* ================================================================
   * Arranque
   * ============================================================== */
  function arrancar() {
    if (MODO === 'demo') document.getElementById('demo-banner').hidden = false;
    estado.perfil = leer(sesion, 'perfil');
    api.config().then(function (c) {
      if (!c || !c.ok) throw c;
      if (c.version !== DATA.version) throw { error: 'version_invalida' };
      estado.config = c;
      var pendiente = leer(local, 'intento');
      if (pendiente && pendiente.estado === 'en_curso') {
        estado.intento = pendiente;
        vistaPrueba();
      } else {
        vistaInicio();
      }
    }).catch(function (e) {
      app.innerHTML = '<h1>No se pudo cargar la aplicación</h1><div class="notice danger"><p>' + esc(textoError(e)) + '</p></div>' +
        '<div class="actions"><button class="btn" onclick="location.reload()">Reintentar</button></div>';
    });
  }

  arrancar();
})();
