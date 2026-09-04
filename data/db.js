'use strict';
const bcrypt = require('bcryptjs');
const config = require('../config');
const { getStore } = require('./storage');

let memoryDB = null;
let initPromise = null;
const store = getStore();

// ── Datos iniciales ──────────────────────────────────────────────────────────
function seedData() {
  const hash = (v) => bcrypt.hashSync(v, 10);
  const users = [
    {
      id: 1,
      nombre: config.profesorUser,
      password: hash(config.profesorPassword),
      tipo: 'profesor',
      nombre_completo: config.profesorNombre
    }
  ];

  if (config.adminUser && config.adminPassword) {
    users.push({
      id: 2,
      nombre: config.adminUser,
      password: hash(config.adminPassword),
      tipo: 'admin',
      nombre_completo: config.adminNombre
    });
  }

  return {
    users,
    evaluaciones: [
      {
        id: 1,
        capacitacion: 'Marketing Digital',
        titulo: 'Evaluacion Marketing Digital',
        intentosMax: config.defaultIntentosMax,
        porcentaje: config.defaultPorcentajeAprobacion,
        duracionMinutos: config.defaultDuracionMinutos,
        activa: true,
        preguntas: [
          {
            id: 1,
            pregunta: 'Cual es la diferencia principal entre SEO y SEM?',
            opciones: [
              'SEO son redes sociales y SEM email marketing',
              'SEO es posicionamiento organico; SEM es publicidad paga',
              'Son lo mismo',
              'SEM es gratuito y SEO pago'
            ],
            correcta: 1,
            explicacion:
              'SEO busca posicionar de forma organica (sin pagar), mientras que SEM incluye la publicidad paga en buscadores.'
          },
          {
            id: 2,
            pregunta: 'Que es un embudo de conversion?',
            opciones: [
              'Una herramienta de Excel',
              'Un proceso que guia al visitante hacia una accion deseada',
              'Un tipo de red social',
              'Un programa de diseno'
            ],
            correcta: 1,
            explicacion:
              'El embudo describe el recorrido del cliente desde que conoce la marca hasta que realiza la accion deseada.'
          },
          {
            id: 3,
            pregunta: 'Que metrica mide el porcentaje de visitantes que realizan una accion deseada?',
            opciones: ['Tasa de rebote', 'CTR (Click Through Rate)', 'Tasa de conversion', 'Bounce rate'],
            correcta: 2,
            explicacion:
              'La tasa de conversion calcula cuantos visitantes completan la accion objetivo (compra, registro, etc.).'
          },
          {
            id: 4,
            pregunta: 'Que es el remarketing?',
            opciones: [
              'Vender productos usados',
              'Mostrar anuncios a usuarios que ya visitaron tu sitio',
              'Enviar emails masivos',
              'Crear redes sociales'
            ],
            correcta: 1,
            explicacion:
              'El remarketing vuelve a mostrar publicidad a quienes ya tuvieron contacto previo con el sitio.'
          },
          {
            id: 5,
            pregunta: 'Cual es el objetivo principal del Content Marketing?',
            opciones: [
              'Vender directamente',
              'Crear y distribuir contenido relevante para atraer audiencia',
              'Hacer spam',
              'Copiar contenido de otros'
            ],
            correcta: 1,
            explicacion: 'El content marketing atrae y retiene audiencia con contenido valioso, no con venta directa.'
          },
          {
            id: 6,
            pregunta: 'Que herramienta se usa para analizar el trafico web?',
            opciones: ['Photoshop', 'Google Analytics', 'Microsoft Word', 'PowerPoint'],
            correcta: 1,
            explicacion: 'Google Analytics mide visitas, origen, comportamiento y conversion del trafico web.'
          },
          {
            id: 7,
            pregunta: 'Que es un KPI?',
            opciones: [
              'Un tipo de anuncio',
              'Un indicador clave de rendimiento',
              'Una red social',
              'Un lenguaje de programacion'
            ],
            correcta: 1,
            explicacion: 'KPI (Key Performance Indicator) mide el cumplimiento de objetivos de negocio.'
          },
          {
            id: 8,
            pregunta: 'Que tipo de contenido genera mayor engagement en redes sociales?',
            opciones: [
              'Texto largo sin imagenes',
              'Contenido visual y videos',
              'Solo enlaces',
              'Publicaciones automatizadas'
            ],
            correcta: 1,
            explicacion: 'El formato visual y de video suele lograr mayor interaccion por parte de la audiencia.'
          },
          {
            id: 9,
            pregunta: 'Que es el Email Marketing?',
            opciones: [
              'Enviar correos personales',
              'Estrategia de marketing basada en envio de emails comerciales',
              'Un tipo de publicidad en TV',
              'Una red social'
            ],
            correcta: 1,
            explicacion: 'El email marketing usa el correo electronico para comunicar ofertas y fidelizar clientes.'
          },
          {
            id: 10,
            pregunta: 'Que es Google Ads?',
            opciones: [
              'Una pagina web',
              'Una plataforma de publicidad en linea de Google',
              'Un buscador alternativo',
              'Un programa de edicion'
            ],
            correcta: 1,
            explicacion: 'Google Ads es la plataforma de publicidad paga de Google (search, display, video, etc.).'
          }
        ]
      },
      {
        id: 2,
        capacitacion: 'Diseno Tecnico Industrial',
        titulo: 'Evaluacion Diseno Tecnico Industrial',
        intentosMax: config.defaultIntentosMax,
        porcentaje: config.defaultPorcentajeAprobacion,
        duracionMinutos: config.defaultDuracionMinutos,
        activa: true,
        preguntas: [
          {
            id: 1,
            pregunta: 'Que significa CAD?',
            opciones: [
              'Computer Aided Design',
              'Creative Art Design',
              'Central Auto Department',
              'Computer Art Drawing'
            ],
            correcta: 0,
            explicacion: 'CAD significa Computer Aided Design (diseno asistido por computadora).'
          },
          {
            id: 2,
            pregunta: 'Que es una cotizacion en un plano tecnico?',
            opciones: ['Un precio', 'Una medida de profundidad', 'Un tipo de material', 'Un color'],
            correcta: 1,
            explicacion: 'La cotizacion (acotacion) indica las medidas y profundidades de las piezas en el plano.'
          },
          {
            id: 3,
            pregunta: 'Cual es el sistema de dimensionamiento utilizado en Argentina?',
            opciones: ['Imperial', 'Metrico (ISO)', 'Britanico', 'Chino'],
            correcta: 1,
            explicacion: 'En Argentina se usa el sistema metrico decimal acorde a normas ISO.'
          },
          {
            id: 4,
            pregunta: 'Que tipo de vista muestra la forma interna de un objeto?',
            opciones: ['Vista frontal', 'Vista lateral', 'Vista en corte', 'Vista superior'],
            correcta: 2,
            explicacion: 'La vista en corte (seccion) deja ver el interior de la pieza.'
          },
          {
            id: 5,
            pregunta: 'Que tipo de material es mas adecuado para piezas que requieren resistencia a la corrosion?',
            opciones: ['Madera', 'Hierro', 'Acero inoxidable', 'Plastico comun'],
            correcta: 2,
            explicacion: 'El acero inoxidable resiste la corrosion mejor que el hierro comun o el plastico estandar.'
          },
          {
            id: 6,
            pregunta: 'Que proceso se utiliza para dar forma a metal mediante golpes?',
            opciones: ['Torneado', 'Fresado', 'Forjado', 'Soldadura'],
            correcta: 2,
            explicacion: 'El forjado da forma al metal por deformacion mediante golpes o presion.'
          },
          {
            id: 7,
            pregunta: 'Que es el control de calidad?',
            opciones: [
              'Un tipo de maquina',
              'Proceso para verificar que los productos cumplan estandares',
              'Una materia de diseno',
              'Un tipo de material'
            ],
            correcta: 1,
            explicacion:
              'El control de calidad asegura que el producto cumpla con los estandares y especificaciones exigidos.'
          },
          {
            id: 8,
            pregunta: 'Que software se utiliza comunmente para diseno tecnico 3D?',
            opciones: ['Microsoft Word', 'AutoCAD / SolidWorks', 'Photoshop', 'Excel'],
            correcta: 1,
            explicacion: 'AutoCAD y SolidWorks son herramientas habituales de diseno tecnico 2D/3D.'
          },
          {
            id: 9,
            pregunta: 'Que es una norma ISO?',
            opciones: [
              'Un tipo de tornillo',
              'Estandar internacional para procesos y productos',
              'Una empresa de computadoras',
              'Un tipo de material'
            ],
            correcta: 1,
            explicacion: 'Las normas ISO definen estandares internacionales de calidad y procesos.'
          },
          {
            id: 10,
            pregunta: 'Que es un plano isometrico?',
            opciones: [
              'Un plano 2D comun',
              'Representacion 3D donde los ejes forman 120 grados',
              'Un plano sin medidas',
              'Un plano solo para arquitectura'
            ],
            correcta: 1,
            explicacion: 'La isometria representa las 3 dimensiones con ejes separados 120 grados.'
          }
        ]
      },
      {
        id: 3,
        capacitacion: 'Diseno Grafico Publicitario',
        titulo: 'Evaluacion Diseno Grafico Publicitario',
        intentosMax: config.defaultIntentosMax,
        porcentaje: config.defaultPorcentajeAprobacion,
        duracionMinutos: config.defaultDuracionMinutos,
        activa: true,
        preguntas: [
          {
            id: 1,
            pregunta: 'Que es la jerarquia tipografica?',
            opciones: [
              'Todas las fuentes iguales',
              'Organizacion visual del texto por importancia',
              'Usar solo una fuente',
              'Tamano uniforme del texto'
            ],
            correcta: 1,
            explicacion: 'La jerarquia tipografica ordena visualmente el contenido para guiar la lectura.'
          },
          {
            id: 2,
            pregunta: 'Que color tiene mayor contraste con el blanco?',
            opciones: ['Gris claro', 'Amarillo', 'Negro', 'Beige'],
            correcta: 2,
            explicacion: 'El negro es el color con mayor contraste respecto del blanco.'
          },
          {
            id: 3,
            pregunta: 'Que es el branding?',
            opciones: [
              'Un tipo de imprenta',
              'Proceso de crear identidad de marca',
              'Un programa de diseno',
              'Una tecnica de impresion'
            ],
            correcta: 1,
            explicacion: 'El branding construye la identidad y percepcion de una marca.'
          },
          {
            id: 4,
            pregunta: 'Cual es la resolucion minima recomendada para impresion?',
            opciones: ['72 DPI', '150 DPI', '300 DPI', '50 DPI'],
            correcta: 2,
            explicacion: 'Para impresion profesional se recomienda 300 DPI; 72 DPI es solo para pantalla.'
          },
          {
            id: 5,
            pregunta: 'Que formato de archivo es ideal para imagenes con transparencia?',
            opciones: ['JPG', 'BMP', 'PNG', 'TIFF'],
            correcta: 2,
            explicacion: 'PNG soporta transparencia y buena compresion; JPG no admite transparencia.'
          },
          {
            id: 6,
            pregunta: 'Que es la regla de los tercios?',
            opciones: [
              'Una regla de matematica',
              'Guia de composicion que divide el area en 9 partes',
              'Una ley de copyright',
              'Un tipo de fuente'
            ],
            correcta: 1,
            explicacion: 'La regla de los tercios divide la imagen en 9 partes para ubicar los elementos clave.'
          },
          {
            id: 7,
            pregunta: 'Que espacio de color se utiliza para impresion?',
            opciones: ['RGB', 'CMYK', 'HEX', 'HSL'],
            correcta: 1,
            explicacion: 'CMYK (cian, magenta, amarillo, negro) es el modelo usado en impresion.'
          },
          {
            id: 8,
            pregunta: 'Que es un briefing de diseno?',
            opciones: [
              'Una factura',
              'Documento con los requisitos y objetivos del proyecto',
              'Un tipo de logo',
              'Un programa de edicion'
            ],
            correcta: 1,
            explicacion: 'El briefing reune los requisitos, objetivos y contexto del proyecto de diseno.'
          },
          {
            id: 9,
            pregunta: 'Que es la psicologia del color en diseno?',
            opciones: [
              'Estudiar colores en la naturaleza',
              'Como los colores influyen en las emociones y percepciones',
              'Mezclar colores en pantalla',
              'Un tipo de filtro'
            ],
            correcta: 1,
            explicacion: 'Estudia la respuesta emocional del publico frente a los colores.'
          },
          {
            id: 10,
            pregunta: 'Que es un mockup?',
            opciones: [
              'Un borrador informal',
              'Representacion visual realista de un diseno',
              'Un tipo de imprenta',
              'Un programa de codigo'
            ],
            correcta: 1,
            explicacion: 'Un mockup muestra como se vera el diseno aplicado a un soporte real.'
          }
        ]
      },
      {
        id: 4,
        capacitacion: 'Diagnostico y Mantenimiento de PC',
        titulo: 'Evaluacion Diagnostico y Mantenimiento de PC',
        intentosMax: config.defaultIntentosMax,
        porcentaje: config.defaultPorcentajeAprobacion,
        duracionMinutos: config.defaultDuracionMinutos,
        activa: true,
        preguntas: [
          {
            id: 1,
            pregunta: 'Cual es la diferencia entre gabinete y CPU?',
            opciones: [
              'Son sinonimos',
              'Gabinete es la caja; CPU es el chip dentro',
              'CPU es la caja y gabinete es el chip',
              'Son lo mismo, cambia el nombre segun fabricante'
            ],
            correcta: 1,
            explicacion: 'El gabinete es la carcasa; la CPU es el chip procesador que va dentro.'
          },
          {
            id: 2,
            pregunta: 'Que tipo de memoria es mas rapida, RAM o HDD?',
            opciones: ['HDD', 'RAM', 'Ambas son iguales', 'Depende del uso'],
            correcta: 1,
            explicacion:
              'La RAM es muchisimo mas rapida que un disco rigido (HDD) porque es memoria volatil de acceso breve.'
          },
          {
            id: 3,
            pregunta: 'Que componente almacena el BIOS/UEFI?',
            opciones: ['Disco duro', 'Tarjeta de video', 'ROM/EEPROM en la motherboard', 'Memoria RAM'],
            correcta: 2,
            explicacion: 'El firmware que arranca la PC (BIOS/UEFI) vive en la ROM/EEPROM de la motherboard.'
          },
          {
            id: 4,
            pregunta: 'Que puede causar que una PC se apague repentinamente?',
            opciones: ['Exceso de archivos', 'Sobrecalentamiento', 'Poca RAM', 'Teclado defectuoso'],
            correcta: 1,
            explicacion: 'El sobrecalentamiento activa protecciones termicas y apaga el equipo de golpe.'
          },
          {
            id: 5,
            pregunta: 'Que protocolo se utiliza para asignar direcciones IP automaticamente?',
            opciones: ['FTP', 'DNS', 'DHCP', 'SMTP'],
            correcta: 2,
            explicacion: 'DHCP entrega direcciones IP automaticamente al conectarse a la red.'
          },
          {
            id: 6,
            pregunta: 'Que mantenimiento preventivo se recomienda realizar periodicamente?',
            opciones: [
              'Cambiar el procesador',
              'Limpiar polvo, verificar temperaturas, actualizar software',
              'Reemplazar la motherboard',
              'Formatear cada semana'
            ],
            correcta: 1,
            explicacion: 'La limpieza interna, el control de temperaturas y las actualizaciones previenen fallas.'
          },
          {
            id: 7,
            pregunta: 'Que herramienta del sistema verifica la integridad de archivos?',
            opciones: ['Paint', 'CHKDSK / SFC', 'Notepad', 'Calculator'],
            correcta: 1,
            explicacion: 'CHKDSK revisa el disco y SFC verifica los archivos de sistema de Windows.'
          },
          {
            id: 8,
            pregunta: 'Cual es el primer paso al formatear un disco duro?',
            opciones: [
              'Instalar Windows',
              'Hacer backup de los datos importantes',
              'Borrar el escritorio',
              'Desconectar la pantalla'
            ],
            correcta: 1,
            explicacion: 'Antes de formatear hay que resguardar la informacion importante en un backup.'
          },
          {
            id: 9,
            pregunta: 'Que es la herramienta Administrador de Tareas de Windows?',
            opciones: [
              'Un programa de edicion',
              'Permite ver procesos, rendimiento y servicios del sistema',
              'Un juego',
              'Un antivirus'
            ],
            correcta: 1,
            explicacion: 'El Administrador de Tareas muestra procesos, rendimiento y servicios en ejecucion.'
          },
          {
            id: 10,
            pregunta: 'Que significa POST en una computadora?',
            opciones: [
              'Publicar en redes',
              'Power-On Self-Test (autodiagnostico al encender)',
              'Un tipo de virus',
              'Un programa de oficina'
            ],
            correcta: 1,
            explicacion: 'POST es el autodiagnostico que corre la PC al encenderse antes de cargar el sistema.'
          }
        ]
      },
      {
        id: 5,
        capacitacion: 'Asistente Administrativo con IA',
        titulo: 'Evaluacion Asistente Administrativo con IA',
        intentosMax: config.defaultIntentosMax,
        porcentaje: config.defaultPorcentajeAprobacion,
        duracionMinutos: config.defaultDuracionMinutos,
        activa: true,
        preguntas: [
          {
            id: 1,
            pregunta: 'Que funcion de Excel permite buscar datos en una tabla?',
            opciones: ['SUM', 'VLOOKUP / BUSCARV', 'COUNT', 'CONCATENAR'],
            correcta: 1,
            explicacion: 'VLOOKUP (BUSCARV) busca un valor dentro de una tabla y devuelve datos asociados.'
          },
          {
            id: 2,
            pregunta: 'Cual es la importancia de clasificar documentos?',
            opciones: [
              'No tiene importancia',
              'Facilita el acceso rapido y organizado a la informacion',
              'Para llenar carpetas',
              'Es opcional'
            ],
            correcta: 1,
            explicacion: 'La clasificacion ordenada permite localizar y recuperar informacion con rapidez.'
          },
          {
            id: 3,
            pregunta: 'Que herramienta de IA puede resumir textos automaticamente?',
            opciones: ['Calculadora', 'ChatGPT / asistentes de IA', 'Paint', 'WinRAR'],
            correcta: 1,
            explicacion: 'Los asistentes con IA (como ChatGPT) resumen y procesan textos automaticamente.'
          },
          {
            id: 4,
            pregunta: 'Que protocolo se recomienda para comunicacion interna?',
            opciones: [
              'No comunicarse',
              'Canales formales, emails institucionales, reportes',
              'Redes sociales personales',
              'Mensajes de texto'
            ],
            correcta: 1,
            explicacion: 'Los canales formales e institucionales aseguran trazabilidad y claridad en la comunicacion.'
          },
          {
            id: 5,
            pregunta: 'Que formato es ideal para bases de datos estructuradas?',
            opciones: ['PDF', 'Excel / CSV', 'JPEG', 'MP3'],
            correcta: 1,
            explicacion: 'Excel y CSV organizan datos en filas y columnas, ideales para estructuras tabulares.'
          },
          {
            id: 6,
            pregunta: 'Como se organiza eficientemente un calendario de eventos?',
            opciones: [
              'De memoria',
              'Usando herramientas digitales con recordatorios y prioridades',
              'En un papel y guardarlo',
              'No es necesario'
            ],
            correcta: 1,
            explicacion: 'Las herramientas digitales con recordatorios reducen olvidos y ordenan prioridades.'
          },
          {
            id: 7,
            pregunta: 'Que elementos debe contener un informe ejecutivo?',
            opciones: [
              'Solo numeros',
              'Resumen, datos clave, analisis y recomendaciones',
              'Solo texto largo',
              'imagenes decorativas'
            ],
            correcta: 1,
            explicacion: 'Un informe ejecutivo sintetiza datos, analisis y recomendaciones accionables.'
          },
          {
            id: 8,
            pregunta: 'Que tecnica ayuda a gestionar el tiempo de trabajo?',
            opciones: [
              'Trabajar sin descanso',
              'Metodo Pomodoro / matriz de Eisenhower',
              'No planificar',
              'Hacer todo a la vez'
            ],
            correcta: 1,
            explicacion: 'El Pomodoro y la matriz de Eisenhower ayudan a priorizar y concentrarse.'
          },
          {
            id: 9,
            pregunta: 'Que es un CRM?',
            opciones: [
              'Un tipo de virus',
              'Sistema de gestion de relaciones con clientes',
              'Un programa de diseno',
              'Una red social'
            ],
            correcta: 1,
            explicacion: 'El CRM (Customer Relationship Management) organiza la gestion de clientes y ventas.'
          },
          {
            id: 10,
            pregunta: 'Que ventaja ofrece la automatizacion con IA en administracion?',
            opciones: [
              'Reemplaza totalmente al humano',
              'Reduce tareas repetitivas y mejora precision',
              'No tiene ventajas',
              'Solo sirve para juguetes'
            ],
            correcta: 1,
            explicacion:
              'La IA automatiza tareas repetitivas y reduce errores, sin reemplazar por completo a las personas.'
          }
        ]
      },
      {
        id: 6,
        capacitacion: 'Administracion de PyMEs',
        titulo: 'Evaluacion Administracion de PyMEs',
        intentosMax: config.defaultIntentosMax,
        porcentaje: config.defaultPorcentajeAprobacion,
        duracionMinutos: config.defaultDuracionMinutos,
        activa: true,
        preguntas: [
          {
            id: 1,
            pregunta: 'Que componente es fundamental en un plan de negocios?',
            opciones: [
              'Solo el nombre',
              'Analisis de mercado, modelo de financiamiento y proyecciones',
              'Un logo bonito',
              'Una oficina grande'
            ],
            correcta: 1,
            explicacion: 'El plan de negocios integra mercado, financiamiento y proyecciones de la empresa.'
          },
          {
            id: 2,
            pregunta: 'Que es el flujo de caja (cash flow)?',
            opciones: [
              'El dinero que se gasta',
              'Registro de entradas y salidas de dinero en un periodo',
              'El precio de los productos',
              'Una cuenta de ahorro'
            ],
            correcta: 1,
            explicacion: 'El flujo de caja registra entradas y salidas de dinero en un periodo determinado.'
          },
          {
            id: 3,
            pregunta: 'Que estrategia de marketing es mas economica para PyMEs?',
            opciones: ['Publicidad en TV', 'Marketing digital y redes sociales', 'Billboards', 'Radio nacional'],
            correcta: 1,
            explicacion: 'El marketing digital permite pautar con presupuestos bajos y medir resultados.'
          },
          {
            id: 4,
            pregunta: 'Que aspecto legal es obligatorio al iniciar un negocio?',
            opciones: [
              'Ninguno',
              'Registro comercial, inscripcion fiscal, permisos locales',
              'Solo tener una pagina web',
              'Ninguno si es pequeno'
            ],
            correcta: 1,
            explicacion: 'Todo negocio debe cumplir registros e inscripciones fijadas por la ley.'
          },
          {
            id: 5,
            pregunta: 'Que sistema se utiliza para controlar el stock de productos?',
            opciones: [
              'Memoria',
              'Sistema de inventario / planificacion de recursos (ERP)',
              'Red social',
              'Correo electronico'
            ],
            correcta: 1,
            explicacion: 'Los sistemas de inventario y ERPs controlan existencias y reposiciones.'
          },
          {
            id: 6,
            pregunta: 'Que es el CRM y para que sirve?',
            opciones: [
              'Un tipo de producto',
              'Gestionar y mejorar la relacion con los clientes',
              'Un programa de diseno',
              'Un tipo de impuesto'
            ],
            correcta: 1,
            explicacion: 'El CRM administra el contacto, seguimiento y fidelizacion de clientes.'
          },
          {
            id: 7,
            pregunta: 'Que porcentaje de ingresos se recomienda invertir en marketing?',
            opciones: ['0%', 'Entre 5% y 15%', '50%', '100%'],
            correcta: 1,
            explicacion: 'La referencia habitual para PyMEs se ubica entre el 5% y el 15% de los ingresos.'
          },
          {
            id: 8,
            pregunta: 'Que estrategia ayuda a fidelizar clientes?',
            opciones: [
              'Subir precios',
              'Programas de fidelizacion, atencion personalizada y calidad',
              'No responder consultas',
              'Cambiar de nombre frecuentemente'
            ],
            correcta: 1,
            explicacion: 'La fidelizacion se logra con experiencia, atencion y calidad constante.'
          },
          {
            id: 9,
            pregunta: 'Que es la facturacion electronica?',
            opciones: [
              'Enviar emails con facturas',
              'Emision de comprobantes fiscales en formato digital',
              'Una red social',
              'Un tipo de producto'
            ],
            correcta: 1,
            explicacion: 'La factura electronica emite comprobantes fiscales validos en formato digital.'
          },
          {
            id: 10,
            pregunta: 'Que es la indentacion fiscal para una PyME?',
            opciones: [
              'Pagar impuestos dobles',
              'Beneficios y deducciones que el Estado ofrece a pequenos negocios',
              'No pagar impuestos nunca',
              'Un tipo de multa'
            ],
            correcta: 1,
            explicacion: 'Los regimenes como el monotributo ofrecen beneficios fiscales a pequenos contribuyentes.'
          }
        ]
      }
    ],
    intentos: [],
    logs: [],
    nextUserId: 3,
    refreshTokens: []
  };
}

// ── API asincrónica de la capa de datos ─────────────────────────────────────
// La base es un documento JSON completo (modelo de datos "documento único").
// Según el almacén configurado, se persiste en archivo o en Postgres.

async function loadData() {
  if (memoryDB) return memoryDB;
  if (!initPromise) {
    initPromise = (async () => {
      const loaded = await store.load();
      if (loaded) {
        memoryDB = loaded;
      } else {
        memoryDB = seedData();
        await store.save(memoryDB);
      }
    })();
  }
  await initPromise;
  return memoryDB;
}

async function saveData() {
  if (memoryDB) await store.save(memoryDB);
}

async function resetDB() {
  memoryDB = seedData();
  initPromise = null;
  await saveData();
}

function getNextId(arr) {
  return arr.length > 0 ? Math.max(...arr.map((x) => x.id)) + 1 : 1;
}

// Exhibe el almacén activo (util para diagnóstico y docs)
function getStorageInfo() {
  return { name: store.name, databaseUrl: !!config.databaseUrl };
}

module.exports = {
  loadData,
  saveData,
  resetDB,
  getNextId,
  seedData,
  getStorageInfo
};
