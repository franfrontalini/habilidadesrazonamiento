/**
 * PLANTILLA de la clave de respuestas. El repositorio es público, así que la
 * clave real NO se versiona.
 *
 * 1. Copiá este archivo como apps-script/Clave.gs (está en .gitignore).
 * 2. Reemplazá cada '?' por la letra de la tabla "Respuestas Correctas"
 *    (página 18 del PDF "ADM Test C (práctica)"), o generá
 *    tools/clave_pdf.json con tools/extraer_clave_pdf.py y compará con
 *    `node tools/verificar.mjs`.
 * 3. En el editor de Apps Script, el archivo "Clave" lleva el contenido de
 *    Clave.gs (con la clave real), nunca esta plantilla.
 *
 * Todo lo que no es CLAVE (versión y especificación) debe quedar igual.
 */

var VERSION_PRUEBAS = 'ADM-C-practica-v1';

var CLAVE = {
  //              1    2    3    4    5    6    7    8    9    10
  cuantitativo: ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?',
  //              11   12   13   14   15   16   17   18   19   20
                 '?', '?', '?', '?', '?', '?', '?', '?', '?', '?'],
  //              1    2    3    4    5    6    7    8    9    10   11   12
  ludico:       ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?'],
  //              1    2    3    4    5    6    7    8    9    10   11
  verbal:       ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?',
  //              12   13   14   15   16   17
                 '?', '?', '?', '?', '?', '?']
};

/**
 * Estructura de cada prueba: cantidad de ítems, opciones válidas por ítem,
 * parte a la que pertenece cada ítem y tiempo de referencia del PDF.
 */
var ESPECIFICACION = {
  cuantitativo: {
    titulo: 'Razonamiento cuantitativo',
    items: 20,
    minutos: 45,
    // Parte A (1–10): comparación de cantidades, opciones A–D.
    // Parte B (11–20): resolución de problemas, opciones A–E.
    opciones: function (n) { return n <= 10 ? 'ABCD' : 'ABCDE'; },
    parte: function (n) { return n <= 10 ? 'A' : 'B'; }
  },
  ludico: {
    titulo: 'Razonamiento lúdico',
    items: 12,
    minutos: 30,
    opciones: function () { return 'ABCDE'; },
    // Situación 1 (1–5: fútbol) y situación 2 (6–12: oficinas).
    parte: function (n) { return n <= 5 ? 'S1' : 'S2'; }
  },
  verbal: {
    titulo: 'Razonamiento verbal',
    items: 17,
    minutos: 40,
    opciones: function () { return 'ABCDE'; },
    // Parte A (1–11): manejo de texto. Parte B (12–17): razonamiento crítico.
    parte: function (n) { return n <= 11 ? 'A' : 'B'; }
  }
};
