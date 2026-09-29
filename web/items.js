/*
 * Contenido de las tres pruebas del "ADM Test C (práctica)".
 * Transcripción fiel del PDF, en el mismo orden. NO contiene la clave de
 * respuestas: la clave vive solo en el servidor (apps-script/Clave.gs).
 *
 * Las fórmulas se escriben en HTML (sup/sub, fracciones y raíces con CSS) y
 * cada expresión matemática lleva una lectura textual para lectores de
 * pantalla (clase .sr-only).
 *
 * Los campos `revision` documentan decisiones de transcripción para el
 * equipo docente; no se muestran a los estudiantes.
 */
(function (root) {
  'use strict';

  // Fracción apilada con lectura accesible "num sobre den".
  function frac(num, den, lectura) {
    return '<span class="math-frac" aria-hidden="true"><span class="num">' + num +
      '</span><span class="den">' + den + '</span></span><span class="sr-only">' +
      (lectura || '(' + num + ') sobre (' + den + ')') + '</span>';
  }
  // Raíz con índice opcional y radicando con vínculo (overline).
  function raiz(indice, radicando, lectura) {
    return '<span class="math-root" aria-hidden="true">' +
      (indice ? '<sup class="idx">' + indice + '</sup>' : '') +
      '<span class="rad">√</span><span class="radicand">' + radicando + '</span></span>' +
      '<span class="sr-only">' + lectura + '</span>';
  }
  function m(html) { return '<span class="math">' + html + '</span>'; }

  var COMPARACION = [
    { key: 'A', html: 'La cantidad A es mayor.' },
    { key: 'B', html: 'La cantidad B es mayor.' },
    { key: 'C', html: 'Las dos cantidades son iguales.' },
    { key: 'D', html: 'Con la información provista no se puede determinar la relación.' }
  ];
  function op(a, b, c, d, e) {
    var out = [];
    var arr = [a, b, c, d, e];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] !== undefined) out.push({ key: 'ABCDE'.charAt(i), html: arr[i] });
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* 1. RAZONAMIENTO CUANTITATIVO                                        */
  /* ------------------------------------------------------------------ */
  var cuantitativo = {
    id: 'cuantitativo',
    titulo: 'Razonamiento cuantitativo',
    minutos: 45,
    proposito: 'Mide la habilidad para usar conceptos matemáticos básicos en situaciones que exigen sentido común y discernimiento. No es un examen de matemática: en la mayoría de los casos se trata de interpretar datos y llegar a la respuesta con recursos mínimos.',
    reglasExtra: [
      'No se permite el uso de calculadora. Podés usar papel para notas y cálculos.',
      'Parte A (preguntas 1 a 10): comparación de cantidades, 4 opciones.',
      'Parte B (preguntas 11 a 20): resolución de problemas, 5 opciones.'
    ],
    partes: {
      A: {
        titulo: 'Parte A · Comparación de cantidades',
        consigna: 'Cada una de las preguntas 1 – 10 consiste en dos cantidades, <strong>CANTIDAD A</strong> y <strong>CANTIDAD B</strong>. Cuando existe información en común para ambas cantidades, ésta aparece en el centro, por encima de las dos cantidades. Usted debe comparar las cantidades A y B y responder con la opción (A, B, C, o D) que considere la mejor. Hay sólo <strong>UNA</strong> respuesta correcta para cada pregunta.'
      },
      B: {
        titulo: 'Parte B · Resolución de problemas',
        consigna: 'Cada una de las preguntas 11 – 20 tiene cinco opciones. Elija la que considere la mejor. Hay sólo <strong>UNA</strong> respuesta correcta para cada pregunta.'
      }
    },
    grupos: {},
    items: [
      { n: 1, parte: 'A', comun: '',
        cantidadA: m('<i>x</i><sup>2</sup> + <i>y</i>'),
        cantidadB: m('<i>x</i><sup>2</sup> − <i>y</i>'),
        opciones: COMPARACION },
      { n: 2, parte: 'A',
        comun: 'Para todo <i>x</i>, sea ' + m('<i>x</i><sup>2</sup> − 7<i>x</i> − 8 = (<i>x</i> − <i>p</i>)(<i>x</i> − <i>q</i>)'),
        cantidadA: m('<i>p</i>'), cantidadB: m('<i>q</i>'), opciones: COMPARACION },
      { n: 3, parte: 'A',
        comun: 'El promedio (media aritmética) de 2 enteros positivos es igual a 31. Cada uno de los enteros es mayor que 26.',
        cantidadA: 'El mayor de los dos enteros.', cantidadB: '36', opciones: COMPARACION },
      { n: 4, parte: 'A',
        comun: 'Para todo número real <i>p</i> y <i>r</i>, sea ' + m('<i>p</i> Ψ <i>r</i> = <i>pr</i> − <i>p</i> + <i>r</i>'),
        cantidadA: m('(−4) Ψ 5'), cantidadB: m('5 Ψ (−4)'), opciones: COMPARACION,
        revision: 'El operador del PDF es la letra griega Ψ (psi); se transcribió igual.' },
      { n: 5, parte: 'A',
        comun: 'Juana es más alta que Pedro y Pedro es más bajo que Laura',
        cantidadA: 'La altura de Juana', cantidadB: 'La altura de Laura', opciones: COMPARACION },
      { n: 6, parte: 'A', comun: '',
        cantidadA: 'El menor entero positivo que es divisible por 14 y 21',
        cantidadB: 'El menor entero positivo que es divisible por 14 y 28', opciones: COMPARACION },
      { n: 7, parte: 'A', comun: '',
        cantidadA: 'El valor del dato que se encuentra a 2,5 desvíos estándar de la media en un conjunto de datos cuyo desvío estándar es 3,0 y cuya media es 20,0',
        cantidadB: '27,5', opciones: COMPARACION },
      { n: 8, parte: 'A',
        comun: m('2<sup><i>n</i>+1</sup> = 126') + '<span class="sr-only"> (2 elevado a la n más 1, igual a 126)</span>',
        cantidadA: m('<i>n</i>'), cantidadB: '6', opciones: COMPARACION },
      { n: 9, parte: 'A',
        comun: m('<i>x</i> ≠ 2'),
        cantidadA: m('−|<i>x</i> − 2|') + '<span class="sr-only"> (menos el valor absoluto de x menos 2)</span>',
        cantidadB: m('|−<i>x</i> + 2|') + '<span class="sr-only"> (valor absoluto de menos x más 2)</span>',
        opciones: COMPARACION },
      { n: 10, parte: 'A',
        comun: m('7<i>x</i> + 3<i>y</i> = 12') + '<br>' + m('21<i>x</i> + 9<i>y</i> = 36'),
        cantidadA: m('<i>x</i>'), cantidadB: m('<i>y</i>'), opciones: COMPARACION },

      { n: 11, parte: 'B',
        enunciado: '<i>n</i> es un múltiplo de 5 y <i>n</i> es un múltiplo de 9. ¿Cuál(es) de las siguientes afirmaciones <strong><u>DEBE(N)</u></strong> ser verdadera(s)?' +
          '<ol class="roman"><li>n es impar</li><li>n es igual a 45</li><li>n es múltiplo de 15</li></ol>',
        opciones: op('Sólo I', 'Sólo II', 'Sólo III', 'I, II y III', 'Ninguna de las tres') },
      { n: 12, parte: 'B',
        enunciado: 'En una elección 20% de la gente que votó era del Partido X y el resto de los votantes era del Partido Y. Al decidir sobre cierto asunto todos los miembros votantes del Partido X votaron por NO y 60% del grupo total de votantes votaron por NO. ¿Qué porcentaje de los miembros del Partido Y votaron por NO?',
        opciones: op('20%', '40%', '50%', '60%', '100%') },
      { n: 13, parte: 'B',
        enunciado: 'Si se define la operación <span class="math">*</span> de la siguiente manera:' +
          '<p class="math-block">Para todo entero <i>m</i> tal que <i>m</i> es par, ' +
          m('(<i>m</i>)<sup>*</sup> = ' + raiz('<i>m</i>', '−<i>m</i>', 'raíz de índice m de menos m')) + '</p>' +
          '<p class="math-block">Para todo entero <i>m</i> tal que <i>m</i> es impar, ' +
          m('(<i>m</i>)<sup>*</sup> = ' + raiz('<i>m</i>', '<i>m</i>', 'raíz de índice m de m')) + '</p>' +
          'Entonces ¿cuál es el valor de ' + m('(2)<sup>*</sup> × (3)<sup>*</sup>') + '?',
        opciones: op(
          m(raiz('6', '6', 'raíz sexta de 6')),
          m(raiz('', '2', 'raíz cuadrada de 2') + ' × ' + raiz('3', '3', 'raíz cúbica de 3')),
          '6', '36', 'No tiene solución entre los números reales'),
        revision: 'En el PDF el índice de la raíz de la opción B es muy pequeño; el texto extraído confirma √2 × ∛3.' },
      { n: 14, parte: 'B',
        enunciado: m('(2<i>uv</i>)<sup>2</sup> + (<i>u</i><sup>2</sup> − <i>v</i><sup>2</sup>)<sup>2</sup> =') +
          '<span class="sr-only"> (2uv) al cuadrado más (u cuadrado menos v cuadrado) al cuadrado, igual a</span>',
        opciones: op(
          m('2<i>uv</i>'),
          m('<i>u</i><sup>2</sup> − <i>v</i><sup>2</sup>'),
          m('<i>u</i><sup>2</sup> + <i>v</i><sup>2</sup>'),
          m('(2<i>uv</i>)<sup>2</sup> + (<i>u</i><sup>2</sup> + <i>v</i><sup>2</sup>)<sup>2</sup>'),
          m('(<i>u</i><sup>2</sup> + <i>v</i><sup>2</sup>)<sup>2</sup>')) },
      { n: 15, parte: 'B',
        enunciado: 'María puede cortar el pasto de su jardín en <strong><i>x</i></strong> horas. Dos horas después de que María comenzara a cortar el pasto de su jardín comenzó a llover y María interrumpió su trabajo ¿Qué porción de su jardín quedó con el pasto sin cortar?',
        opciones: op(
          m(frac('2 − <i>x</i>', '<i>x</i>', '(2 menos x) sobre x')),
          m(frac('<i>x</i>', '2', 'x sobre 2')),
          m('<i>x</i> − 2'),
          m(frac('<i>x</i> − 2', '2', '(x menos 2) sobre 2')),
          m(frac('<i>x</i> − 2', '<i>x</i>', '(x menos 2) sobre x'))) },
      { n: 16, parte: 'B',
        enunciado: '<p class="math-block">Conjunto <i>S</i> de datos: 128, 119, 207, 116, 116, 107<br>Conjunto <i>R</i> de datos: 1579, 1548, 1600, 1567, 1500</p>¿En cuántas unidades es el rango del conjunto <i>S</i> mayor que el rango del conjunto <i>R</i>?',
        opciones: op('0', '10', '20', '30', '35') },
      { n: 17, parte: 'B',
        enunciado: 'Si <i>a</i> y <i>b</i> son enteros positivos pares ¿cuál(es) de los siguientes valores <strong><u>DEBE(N)</u></strong> ser par(es)?' +
          '<ol class="roman">' +
          '<li>' + m('<i>a</i><sup><i>b</i></sup>') + '<span class="sr-only"> (a elevado a la b)</span></li>' +
          '<li>' + m('(<i>a</i> + 1)<sup><i>b</i></sup>') + '<span class="sr-only"> (a más 1, elevado a la b)</span></li>' +
          '<li>' + m('<i>a</i><sup>(<i>b</i>+1)</sup>') + '<span class="sr-only"> (a elevado a la b más 1)</span></li></ol>',
        opciones: op('Sólo I', 'Sólo II', 'I y II solamente', 'I y III solamente', 'I, II y III') },
      { n: 18, parte: 'B',
        enunciado: 'La suma de dos números, <strong><i>x</i></strong> e <strong><i>y</i></strong>, es igual a dos veces su producto. Si <strong><i>x</i></strong> = 3 ¿cuál es el valor de <strong><i>y</i></strong>?',
        opciones: op(m(frac('1', '8')), m(frac('3', '5')), m(frac('3', '2')), m(frac('5', '3')), m(frac('7', '3'))) },
      { n: 19, parte: 'B',
        enunciado: 'Se tira una moneda 5 veces ¿Cuál es la probabilidad de que salga cara <strong><u>por lo menos</u></strong> una vez?',
        opciones: op(m(frac('1', '2')), m(frac('1', '5')), m(frac('1', '16')), m(frac('1', '32')), m(frac('31', '32'))) },
      { n: 20, parte: 'B',
        enunciado: '<strong><i>S</i></strong> es la suma de tres enteros consecutivos, el mayor de los cuales es <strong><i>x</i></strong>. En términos de <strong><i>S</i></strong> ¿cuál de las siguientes es la suma de tres enteros consecutivos, el menor de los cuales es <strong><i>x</i></strong>?',
        opciones: op(m('<i>S</i> − 6'), m('<i>S</i> − 3'), m('<i>S</i> + 3'), m('<i>S</i> + 6'), m('2<i>S</i>')) }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. RAZONAMIENTO LÚDICO                                              */
  /* ------------------------------------------------------------------ */
  var ludico = {
    id: 'ludico',
    titulo: 'Razonamiento lúdico',
    minutos: 30,
    proposito: 'Explora la habilidad para entender una estructura de relaciones entre personas, lugares, objetos o eventos ficticios, deducir nueva información a partir de esas relaciones y tomar decisiones que respeten las condiciones del problema.',
    reglasExtra: [
      'Las preguntas se agrupan en dos situaciones. Las reglas de cada situación se muestran junto a sus preguntas y podés volver a consultarlas en cualquier momento.',
      'Todas las preguntas tienen 5 opciones.'
    ],
    consigna: 'Cada pregunta está basada en una situación y un conjunto de condiciones, reglas y/o restricciones. Para cada pregunta elija la opción que considere la mejor. Hay sólo <strong>UNA</strong> respuesta correcta para cada pregunta.',
    partes: {},
    grupos: {
      futbol: {
        titulo: 'Preguntas 1 – 5 · Situación y reglas',
        etiqueta: 'reglas',
        html: '<p>En una división regional de fútbol hay seis equipos: J, K, L, M, N y O. Durante la temporada, todos los equipos juegan a las 10 de la mañana de cada sábado. Cada equipo debe jugar contra cada uno de los otros equipos una y sólo una vez durante toda la temporada.</p>' +
          '<ul class="rules"><li>J juega primero contra M y segundo contra O</li><li>K juega primero N y tercero contra L</li><li>L juega primero contra O</li></ul>',
        revision: 'Regla 2: el PDF dice "K juega primero N" (sin "contra"). Se mantuvo literal.'
      },
      oficinas: {
        titulo: 'Preguntas 6 – 12 · Situación y reglas',
        etiqueta: 'reglas',
        html: '<p>Siete empleados — J, K, L, M, N, O y P — serán asignados a cuatro oficinas — 101, 102, 103 y 104. A cada una de las tres primeras oficinas podrán ser asignados dos empleados. A la oficina 104 se podrá asignar solamente un empleado.</p>' +
          '<ul class="rules"><li>Ni J ni N serán asignados a una oficina con K</li><li>L no será asignado a una oficina con M</li><li>Si O no es asignado a una oficina con M, entonces O es asignado a una oficina con P</li></ul>'
      }
    },
    items: [
      { n: 1, grupo: 'futbol', enunciado: '¿Cuál de las siguientes opciones representa los pares de equipos que juegan el primer sábado?',
        opciones: op('J y K; L y O; M y N', 'J y K; L y N; M y O', 'J y L; K y N; M y O', 'J y M; K y L; N y O', 'J y M; K y N; L y O') },
      { n: 2, grupo: 'futbol', enunciado: '¿Contra cuál de los siguientes equipos K debe jugar segundo?',
        opciones: op('J', 'L', 'M', 'N', 'O') },
      { n: 3, grupo: 'futbol', enunciado: '¿Cuál es el número total de partidos que cada equipo debe jugar durante la temporada?',
        opciones: op('3', '4', '5', '6', '7') },
      { n: 4, grupo: 'futbol', enunciado: 'Si M gana 5 partidos ¿cuál de las siguientes afirmaciones debe ser verdadera?',
        opciones: op('J pierde 5 partidos', 'J gana 4 partidos', 'J gana su primer partido', 'K gana 5 partidos', 'K pierde por lo menos un partido') },
      { n: 5, grupo: 'futbol', enunciado: 'El último conjunto de partidos podría ser entre los equipos',
        opciones: op('J y K; L y O; M y N', 'J y L; K y O; M y N', 'J y M; K y L; N y O', 'J y N; K y L; M y O', 'J y O; K y N; L y M') },
      { n: 6, grupo: 'oficinas', enunciado: '¿Cuáles de los siguientes tres pares de empleados pueden ser asignados a las tres primeras oficinas?',
        opciones: op('J y N; K y P; L y M', 'J y N; K y L; O y P', 'J y K; L y P; N y O', 'J y L; K y N; M y O', 'J y P; L y N; K y O') },
      { n: 7, grupo: 'oficinas', enunciado: 'Si L es asignado a una oficina con P ¿cuál de las siguientes afirmaciones debe ser verdadera?',
        opciones: op('K es asignado a una oficina con M', 'K es asignado a una oficina con N', 'J es asignado a una oficina con M', 'K es asignado a la 104', 'J es asignado a la 104') },
      { n: 8, grupo: 'oficinas', enunciado: 'Si L es asignado a la 104 ¿Cuál de los siguientes debe ser asignado a una oficina con J?',
        opciones: op('K', 'M', 'N', 'O', 'P') },
      { n: 9, grupo: 'oficinas', enunciado: 'Si J es asignado a una oficina con M ¿cuál de las siguientes afirmaciones debe ser verdadera?',
        opciones: op('K es asignado a la 104', 'L es asignado a la 104', 'N es asignado a la 104', 'L es asignado a una oficina con K o con N', 'P es asignado a una oficina con K o con N') },
      { n: 10, grupo: 'oficinas', enunciado: 'Si K es asignado a una oficina con P ¿cuál de las siguientes es una lista completa y exacta de los empleados que podrían ser asignados a la 104?',
        opciones: op('J', 'L', 'J, L', 'L, N', 'J, L, N') },
      { n: 11, grupo: 'oficinas', enunciado: 'Si P es asignado a una oficina con N ¿cuál de las siguientes afirmaciones <strong><u>NO PUEDE</u></strong> ser verdadera?',
        opciones: op('O es asignado a una oficina con M', 'K es asignado a una oficina con L', 'J es asignado a la 104', 'K es asignado a la 104', 'L es asignado a la 104') },
      { n: 12, grupo: 'oficinas', enunciado: 'Si P es asignado la 104 ¿cuál es el número total de posibles agrupamientos de los empleados en tres pares de compañeros de oficina?',
        opciones: op('1', '2', '3', '4', '5'),
        revision: 'El PDF dice "Si P es asignado la 104" (falta "a"). Se mantuvo literal.' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. RAZONAMIENTO VERBAL                                              */
  /* ------------------------------------------------------------------ */
  var verbal = {
    id: 'verbal',
    titulo: 'Razonamiento verbal',
    minutos: 40,
    proposito: 'Mide la habilidad para razonar en situaciones en las que el uso del lenguaje es crucial para resolver problemas: comprensión de textos y análisis de argumentos.',
    reglasExtra: [
      'Parte A (preguntas 1 a 11): un texto corto con 4 preguntas y un texto largo con 7 preguntas. Los textos completos quedan disponibles durante toda la prueba.',
      'Parte B (preguntas 12 a 17): razonamiento crítico sobre situaciones diversas.',
      'Respondé usando solo la lógica interna del texto, sin recurrir a conocimientos previos sobre el tema.'
    ],
    partes: {
      A: {
        titulo: 'Parte A · Manejo de texto',
        consigna: 'Cada texto de este grupo está seguido por preguntas basadas en su contenido. Después de leer el texto elija la mejor opción para responder la correspondiente pregunta. Responda cada pregunta sobre la base de lo que está <strong>explícito</strong> o <strong>implícito</strong> en el texto.'
      },
      B: {
        titulo: 'Parte B · Razonamiento crítico',
        consigna: 'Analice la situación sobre la cual se basa cada una de las siguientes preguntas. Luego elija la opción que representa la mejor respuesta.'
      }
    },
    grupos: {
      piel: {
        titulo: 'Texto de las preguntas 1 – 4',
        etiqueta: 'texto',
        html: '<p>Aunque gran cantidad de organismos patogénicos constantemente se ponen en contacto con la piel, éstos hallan en ella un medio ambiente muy desfavorable y, si no existe una herida, tienen gran dificultad para colonizarla. Esta capacidad “auto-esterilizante” de la piel es resultado de la tendencia que tienen todos los ecosistemas bien desarrollados hacia la homeostasis, o el mantenimiento del status quo.</p>' +
          '<p>Las especies que típicamente viven en el suelo, agua y otras partes raramente se reproducen en la piel. La piel indemne es también desfavorable para la mayor parte de los patógenos humanos. La piel es demasiado ácida o demasiado árida para algunas especies. El constante recambio de las capas superficiales de la piel dificulta aún más la posibilidad de que se establezcan invasores. El mecanismo de defensa más interesante, sin embargo, es resultado de las actividades metabólicas de la <strong>flora residente</strong>. Los <strong>ácidos grasos insaturados</strong>, un importante componente de los lípidos que se encuentran en <strong>el sebo que se junta en la superficie de la piel</strong>, inhiben el crecimiento de varios <strong>patógenos cutáneos bacterianos y micóticos</strong> (hongos). Estos ácidos son el producto metabólico de <strong>ciertos miembros gram-positivos de la comunidad cutánea</strong>, los cuales degradan los <strong>lípidos más complejos</strong> que se encuentran en secreciones de sebo más nuevas.</p>'
      },
      tolstoi: {
        titulo: 'Texto de las preguntas 5 – 11',
        etiqueta: 'texto',
        html: '<p><strong>“Las obras maestras son mudas,” escribió Flaubert. “Tienen el aspecto sereno de los mismísimos productos de la naturaleza, de los grandes animales y las montañas.”</strong> Flaubert bien podría haber estado hablando de <i>La Guerra y la Paz</i>, aquella obra vasta, silenciosa, insondable y simple que provoca un sinfín de preguntas a través de la majestuosidad de su ser. La simpleza de Tolstoi es “arrolladora”, dice Bayley, el crítico, “desconcertante” porque proviene de “la impresión casual que Tolstoi tiene de que el mundo es tal cual él lo ve.” Al igual que otros escritores rusos del siglo XIX, Tolstoi es “notable” porque “dice lo que quiere decir”, pero se aparta de todos los demás y de la mayor parte de los escritores occidentales por su identificación con la vida, identificación que es tan completa que nos hace olvidar que es un artista. Él es el centro de su trabajo pero su egocentrismo es de una clase especial. Goethe, por ejemplo, dice Bayley, “se preocupaba nada más que por él mismo. Tolstoi era nada más que él mismo.”</p>' +
          '<p>A pesar de sus variados modos de escritura y de la multiplicidad de personajes en su ficción, Tolstoi y su obra son uno. La famosa “conversión” en su adultez media, relatada con emoción en <i>Confesión</i>, fue la cumbre de su vida espiritual temprana y no un desvío de ella. Los cambios aparentemente fundamentales que lo llevaron de la narrativa épica a la parábola dogmática, de una actitud gozosa y optimista hacia la vida al pesimismo y al cinismo, de <i>La Guerra y la Paz</i> a <i>La Sonata Kreutzer</i>, provinieron de las mismas profundidades inquietas e impresionables de un espíritu independiente que anhelaba llegar a la verdad de su experiencia. “La verdad es mi héroe,” escribió Tolstoi en su juventud, cuando narraba las vicisitudes de la batalla de Sebastopol. La verdad siguió siendo su héroe — la suya propia, no la verdad de los otros. Los otros caían de bruces frente a Napoleón, creían que un solo hombre podría cambiar los destinos de naciones, adherían a rituales sin significado, formaban sus gustos de acuerdo a los cánones establecidos del arte. Tolstoi revirtió todos los preconceptos; y con cada reversión derrocó el “sistema”, la “máquina”, la creencia ungida externamente, el comportamiento convencional para así favorecer la vida asistemática, impulsiva, una vida de motivaciones internas y de soluciones basadas en el pensamiento independiente.</p>' +
          '<p>En su obra lo artificial y lo genuino son siempre exhibidos en dramática oposición: el supuestamente grande Napoleón y el verdaderamente grande e ignorado Capitán Tushin, o la verdadera experiencia en el campo de batalla de Nicolás Rostov y su posterior relato de la misma. Lo simple es siempre enfrentado a lo ornamentado, el conocimiento ganado de la experiencia a las aseveraciones de creencias prestadas. <strong>La mágica simpleza de Tolstoi</strong> es el producto de estas tensiones; su obra es un registro de las preguntas que se formuló a sí mismo y de las respuestas que encontró en su búsqueda. Los más grandes personajes de su narrativa ejemplifican esta búsqueda y su felicidad depende de la magnitud de sus respuestas. Tolstoi quería la felicidad pero sólo la felicidad ganada con esfuerzo, la realización emocional y la claridad intelectual que sólo podían venir como premio de un esfuerzo supremo. Despreciaba las satisfacciones menores.</p>'
      },
      serpientes: {
        titulo: 'Texto de las preguntas 13 – 14',
        etiqueta: 'texto',
        html: '<p>En cierta área pantanosa, tanto la muy venenosa serpiente de coral como una clase de serpiente mucho menos venenosa tienen bandas rojas, negras y blancas. A sólo 100 kilómetros de distancia, en un área más seca, la variedad local de serpiente de coral carece de bandas rojas. En ese mismo lugar, la especie de serpiente menos venenosa también carece de bandas rojas. La explicación es que, en ambos hábitats, la cuidadosa imitación de la serpiente de coral le garantiza a la variedad menos venenosa una cierta protección que de otro modo no tendría.</p>'
      }
    },
    items: [
      { n: 1, parte: 'A', grupo: 'piel', enunciado: 'El propósito principal del pasaje es',
        opciones: op('ofrecer un análisis de algunos procesos metabólicos',
          'detallar las maneras en que pueden ser inhibidos los hongos y las bacterias',
          'describir mecanismos con los que la piel se protege de patógenos',
          'analizar los métodos a través de los cuales los sistemas biológicos mantienen el status quo',
          'dar un ejemplo específico de las defensas básicas de la piel contra los patógenos') },
      { n: 2, parte: 'A', grupo: 'piel', enunciado: '¿A cuál de los siguientes elementos que aparecen en negrita en el texto se refiere la frase “<strong>flora residente</strong>”, también en negrita?',
        opciones: op('ácidos grasos insaturados', 'el sebo que se junta en la superficie de la piel',
          'patógenos cutáneos bacterianos y micóticos', 'ciertos miembros gram-positivos de la comunidad cutánea', 'lípidos más complejos'),
        revision: 'Depende de las negritas del texto; se reprodujeron las mismas seis expresiones en negrita que el PDF.' },
      { n: 3, parte: 'A', grupo: 'piel', enunciado: 'Todos los siguientes elementos se encuentran entre las defensas naturales de la piel contra organismos patógenos <strong><u>EXCEPTO</u></strong>',
        opciones: op('la sequedad de la piel', 'la acidez de la piel', 'la tendencia de los patógenos a la homeostasis',
          'el recambio de las capas cutáneas superficiales', 'la degradación metabólica de los lípidos') },
      { n: 4, parte: 'A', grupo: 'piel', enunciado: '¿Cuál de las siguientes maneras usa la autora para presentar su argumentación?',
        opciones: op('formula un problema y luego aporta una solución', 'presenta un fenómeno y luego analiza las razones que lo producen',
          'provee información y luego saca conclusiones de ésta', 'hace una aseveración general y luego razona por analogía',
          'hace una inferencia y luego la desarrolla por medio de ejemplos') },
      { n: 5, parte: 'A', grupo: 'tolstoi', enunciado: '¿Cuál de las siguientes afirmaciones caracteriza mejor la actitud de la autora respecto de Tolstoi?',
        opciones: op('Critica el cinismo de sus últimas obras', 'Encuentra que su teatralidad es artificial', 'Admira su completa sinceridad',
          'Halla que su incoherencia es perturbadora', 'Respeta su devoción por la ortodoxia') },
      { n: 6, parte: 'A', grupo: 'tolstoi', enunciado: '¿Cuál de las siguientes afirmaciones parafrasea mejor la opinión de Flaubert que aparece en negrita en el texto?',
        opciones: op('Las obras maestras parecen comunes e insulsas desde la perspectiva de una era posterior',
          'Las grandes obras de arte no ofrecen explicaciones sobre sí mismas como así tampoco lo hacen los objetos naturales',
          'Las obras de arte importantes tienen un lugar en la historia por su cualidad única',
          'Los aspectos más importantes del buen arte son el orden y la tranquilidad que reflejan',
          'Las obras maestras que perduran en el tiempo representan las fuerzas de la naturaleza') },
      { n: 7, parte: 'A', grupo: 'tolstoi', enunciado: 'La autora cita a Bayley en las primeras líneas para mostrar que',
        opciones: op('aunque Tolstoi observa e interpreta la vida, no se mantiene al margen de su propia experiencia',
          'el realismo de la obra de Tolstoi da la ilusión de que sus novelas son registros de eventos de la vida diaria',
          'lamentablemente, Tolstoi no es consciente de sus propias limitaciones aunque es sincero en su intento de describir la experiencia',
          'aunque Tolstoi trabaja sin demasiado cuidado y cae en presuposiciones injustificadas, su obra tiene un inexplicable halo de verdad',
          'la perspectiva personal de Tolstoi hace a su obra casi ininteligible para la mayoría de los lectores') },
      { n: 8, parte: 'A', grupo: 'tolstoi', enunciado: 'La autora afirma que la conversión de Tolstoi representó',
        opciones: op('una renunciación total al mundo', 'el rechazo de ideas vanguardistas', 'el resultado natural de sus creencias más tempranas',
          'la aceptación de una religión que previamente había rechazado', 'un cambio fundamental en su estilo de escritura') },
      { n: 9, parte: 'A', grupo: 'tolstoi', enunciado: 'De acuerdo al texto, la respuesta de Tolstoi a los valores intelectuales y artísticos aceptados en su época fue',
        opciones: op('seleccionar los más válidos de entre todos ellos', 'combinar puntos de vista opuestos para formar una nueva doctrina',
          'rechazar los fundamentos de la religión para así poder servir a su arte', 'subvertirlos para defender un nuevo punto de vista político',
          'trastocarlos para poder ser fiel a su propia experiencia') },
      { n: 10, parte: 'A', grupo: 'tolstoi', enunciado: '¿Cuál de las siguientes afirmaciones es verdadera respecto de <i>La Guerra y la Paz</i>, según se puede inferir del pasaje?',
        opciones: op('Pertenece a un período temprano de la obra de Tolstoi', 'Incorpora la polémica de la época sobre el desorden de la vida rusa',
          'Tiene una trama argumental simple', 'Es una obra que refleja una visión irónica de la vida',
          'Se ajusta a los parámetros de refinamiento estético sostenidos por los contemporáneos de Tolstoi') },
      { n: 11, parte: 'A', grupo: 'tolstoi', enunciado: 'De acuerdo con el texto, la explicación de “<strong>La mágica simpleza de Tolstoi</strong>”, en el contexto en que aparece en negrita, se basa en parte en su',
        opciones: op('notable poder de observación y su facilidad para la descripción exacta', 'persistente resistencia a los convencionalismos unida a su gran energía',
          'inusual habilidad para reducir a unas pocas palabras la descripción de situaciones complejas',
          'constante odio por la doctrina religiosa y su preferencia por el nuevo cientificismo',
          'continuo esfuerzo por representar lo natural en oposición a lo pretencioso') },

      { n: 12, parte: 'B',
        enunciado: '<blockquote class="stimulus"><p><strong>Hugo:</strong> Si estoy leyendo un buen libro, la historia me absorbe de tal manera que si alguien me llama, no soy consciente de ello y no oigo cosa alguna.</p><p><strong>Juan:</strong> Si usted no puede oír cosa alguna, no puede saber que alguien lo ha estado llamando.</p></blockquote>La respuesta de Juan muestra que ha hecho cuál de las siguientes suposiciones:',
        opciones: op('Cuando Hugo está concentrado leyendo un buen libro, nadie lo llama.',
          'Hugo no puede saber que alguien lo ha llamado a menos que haya oído ese llamado.',
          'Cuando Hugo no está concentrado leyendo algún buen libro, alguien frecuentemente lo llama.',
          'Hugo se concentra más de lo que él mismo cree.',
          'Hugo lee buenos libros y hay gente que lo llama, pero no al mismo tiempo.') },
      { n: 13, parte: 'B', grupo: 'serpientes', enunciado: '¿Cuál de las siguientes afirmaciones puede ser una presuposición relevante que subyace a la explicación ofrecida en el texto?',
        opciones: op('Las serpientes de coral reclaman territorios individuales, los cuales defienden contra otras serpientes.',
          'La coloración roja es un camuflaje efectivo principalmente en áreas secas, donde los rojos naturales son más comunes que en otras partes.',
          'La presencia de una serpiente de coral tiene un extraño efecto paralizante sobre algunas de sus presas.',
          'Los predadores cuyas dietas incluyen serpientes tienden a evitar a las más venenosas',
          'Las serpientes de diferentes especies pueden coexistir en paz siempre y cuando no compitan por la misma comida.') },
      { n: 14, parte: 'B', grupo: 'serpientes', enunciado: '¿Cuál de las siguientes afirmaciones se puede inferir lógicamente del texto?',
        opciones: op('Todas las variedades de serpientes de coral tienen bandas rojas, negras y blancas.',
          'La diferenciación entre las serpientes de coral con bandas rojas y las serpientes de coral sin bandas rojas precede a la correspondiente diferenciación entre los miembros de la especie de serpientes menos venenosas mencionadas.',
          'Los miembros de la especie de serpientes menos venenosas mencionadas producen el mismo tipo de veneno que la serpiente de coral aunque en menor cantidad.',
          'Las serpientes de coral de diferentes áreas tienen diferentes tipos de veneno.',
          'La protección que la variedad menos venenosa de serpiente mencionada obtiene de la serpiente de coral significa que la variedad menos venenosa deber ser de alguna utilidad para la serpiente de coral.'),
        revision: 'Opción E: el PDF dice "deber ser" (errata por "debe ser"). Se mantuvo literal.' },
      { n: 15, parte: 'B',
        enunciado: '<blockquote class="stimulus"><p>Sólo cuando la alarma suena en la casa, la policía o los bomberos llegan allí. Para que la policía o los bomberos lleguen a la casa, deben pasar frente la escuela. Sólo la policía pasó frente a la escuela ayer, y ni la policía ni los bomberos respondieron a alarmas anteayer.</p></blockquote>¿Cuál de las siguientes afirmaciones puede inferirse lógicamente del texto?',
        opciones: op('Los bomberos no llegaron a la casa ayer.', 'La alarma no sonó en la casa ayer.', 'La policía llegó a la casa ayer.',
          'La policía pasó frente a la escuela anteayer.', 'Los bomberos fallaron en su capacidad de respuesta a la alarma que sonó ayer.'),
        revision: 'El PDF dice "pasar frente la escuela" (falta "a"). Se mantuvo literal.' },
      { n: 16, parte: 'B',
        enunciado: '<blockquote class="stimulus"><p>Un estudio de los datos sobre erupciones volcánicas en el siglo XX muestra un lento y sostenido incremento en el número de informes de erupciones, con bruscas caídas que coinciden con las dos guerras mundiales. La interpretación más razonable de estos datos es que la actividad volcánica en el siglo XX se mantuvo a un nivel constante a lo largo del siglo.</p></blockquote>¿Cuál de las siguientes afirmaciones puede ser una presuposición relevante que subyace a la interpretación de los datos ofrecida en el texto?',
        opciones: op('Es esperable que el lento crecimiento del número de informes de erupciones volcánicas en el siglo XX continúe en el siglo XXI.',
          'Las erupciones volcánicas constituyen sólo un pequeño porcentaje de la suma total de la actividad volcánica; sin embargo, tienden a ser divulgadas con más presteza que el resto de la actividad volcánica.',
          'El hecho que las bruscas caídas en los informes de erupciones volcánicas ocurrieran durante las dos guerras es atribuible a fluctuaciones aleatorias de los datos.',
          'Las variaciones en la frecuencia de los informes de erupciones volcánicas pueden atribuirse razonablemente a factores que afectaron la posibilidad de informar.',
          'Los datos anteriores al siglo XX son demasiado asistemáticos como para apoyar cualquier conclusión razonablemente firme sobre los niveles de actividad volcánica a largo plazo.') },
      { n: 17, parte: 'B',
        enunciado: '<blockquote class="stimulus"><p>Mirar televisión con inteligencia es una habilidad que debe ser aprendida, tal como debe ser aprendida la habilidad para leer un libro. La televisión, en gran medida a causa de las ilusiones inherentes a ella como un medio visual que se apoya tanto en las virtudes como en las flaquezas de la cámara, crea ilusiones de las cuales uno debe ser consciente si intenta recrear la realidad de carne y hueso que estas ilusiones distorsionan.</p></blockquote>¿Cuál es la conclusión principal que se puede obtener del texto?',
        opciones: op('Se requiere un televidente inteligente para extraer una imagen auténtica del mundo y de los eventos que ocurren en éste de las imágenes con que la televisión presenta a ambos.',
          'Saber cómo mirar televisión inteligentemente es una habilidad no menos importante que la de saber leer un libro.',
          'Los creadores de programas de televisión poseen un arsenal de trucos visuales con los que engañan al televidente distraído.',
          'La innovación tecnológica en video cámaras es frustrante ya que frecuentemente pone a disposición del público elementos innecesarios mientras que no provee otros elementos que el usuario sí necesita.',
          'La habilidad para ver televisión inteligentemente es muy parecida a la habilidad para leer un libro ya que cada una requiere sobre todo la habilidad para reconocer ilusiones y distorsiones como lo que son.') }
    ]
  };

  root.ADM_ITEMS = {
    version: 'ADM-C-practica-v1',
    pruebas: { cuantitativo: cuantitativo, ludico: ludico, verbal: verbal },
    orden: ['cuantitativo', 'ludico', 'verbal']
  };
})(typeof window !== 'undefined' ? window : this);
