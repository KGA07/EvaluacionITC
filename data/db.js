'use strict';
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let memoryDB = null;
const DB_FILE = path.join(__dirname, '..', 'db.json');

function getNextId(arr) {
  return arr.length > 0 ? Math.max(...arr.map((x) => x.id)) + 1 : 1;
}

function seedData() {
  const profHash = bcrypt.hashSync(process.env.PROFESOR_PASSWORD || '1234', 10);
  return {
    users: [
      {
        id: 1,
        nombre: process.env.PROFESOR_USER || 'GKempe',
        password: profHash,
        tipo: 'profesor',
        nombre_completo: process.env.PROFESOR_NOMBRE || 'Gustavo Kempe'
      }
    ],
    evaluaciones: [
      {
        id: 1,
        capacitacion: 'Marketing Digital',
        titulo: 'Evaluacion Marketing Digital',
        preguntas: [
          { id: 1, pregunta: 'Cual es la diferencia principal entre SEO y SEM?', opciones: ['SEO son redes sociales y SEM email marketing', 'SEO es posicionamiento organico; SEM es publicidad paga', 'Son lo mismo', 'SEM es gratuito y SEO pago'], correcta: 1 },
          { id: 2, pregunta: 'Que es un embudo de conversion?', opciones: ['Una herramienta de Excel', 'Un proceso que guia al visitante hacia una accion deseada', 'Un tipo de red social', 'Un programa de diseno'], correcta: 1 },
          { id: 3, pregunta: 'Que metrica mide el porcentaje de visitantes que realizan una accion deseada?', opciones: ['Tasa de rebote', 'CTR (Click Through Rate)', 'Tasa de conversion', 'Bounce rate'], correcta: 2 },
          { id: 4, pregunta: 'Que es el remarketing?', opciones: ['Vender productos usados', 'Mostrar anuncios a usuarios que ya visitaron tu sitio', 'Enviar emails masivos', 'Crear redes sociales'], correcta: 1 },
          { id: 5, pregunta: 'Cual es el objetivo principal del Content Marketing?', opciones: ['Vender directamente', 'Crear y distribuir contenido relevante para atraer audiencia', 'Hacer spam', 'Copiar contenido de otros'], correcta: 1 },
          { id: 6, pregunta: 'Que herramienta se usa para analizar el trafico web?', opciones: ['Photoshop', 'Google Analytics', 'Microsoft Word', 'PowerPoint'], correcta: 1 },
          { id: 7, pregunta: 'Que es un KPI?', opciones: ['Un tipo de anuncio', 'Un indicador clave de rendimiento', 'Una red social', 'Un lenguaje de programacion'], correcta: 1 },
          { id: 8, pregunta: 'Que tipo de contenido genera mayor engagement en redes sociales?', opciones: ['Texto largo sin imagenes', 'Contenido visual y videos', 'Solo enlaces', 'Publicaciones automatizadas'], correcta: 1 },
          { id: 9, pregunta: 'Que es el Email Marketing?', opciones: ['Enviar correos personales', 'Estrategia de marketing basada en envio de emails comerciales', 'Un tipo de publicidad en TV', 'Una red social'], correcta: 1 },
          { id: 10, pregunta: 'Que es Google Ads?', opciones: ['Una pagina web', 'Una plataforma de publicidad en linea de Google', 'Un buscador alternativo', 'Un programa de edicion'], correcta: 1 }
        ]
      },
      {
        id: 2,
        capacitacion: 'Diseno Tecnico Industrial',
        titulo: 'Evaluacion Diseno Tecnico Industrial',
        preguntas: [
          { id: 1, pregunta: 'Que significa CAD?', opciones: ['Computer Aided Design', 'Creative Art Design', 'Central Auto Department', 'Computer Art Drawing'], correcta: 0 },
          { id: 2, pregunta: 'Que es una cotizacion en un plano tecnico?', opciones: ['Un precio', 'Una medida de profundidad', 'Un tipo de material', 'Un color'], correcta: 1 },
          { id: 3, pregunta: 'Cual es el sistema de dimensionamiento utilizado en Argentina?', opciones: ['Imperial', 'Metrico (ISO)', 'Britanico', 'Chino'], correcta: 1 },
          { id: 4, pregunta: 'Que tipo de vista muestra la forma interna de un objeto?', opciones: ['Vista frontal', 'Vista lateral', 'Vista en corte', 'Vista superior'], correcta: 2 },
          { id: 5, pregunta: 'Que tipo de material es mas adecuado para piezas que requieren resistencia a la corrosion?', opciones: ['Madera', 'Hierro', 'Acero inoxidable', 'Plastico comun'], correcta: 2 },
          { id: 6, pregunta: 'Que proceso se utiliza para dar forma a metal mediante golpes?', opciones: ['Torneado', 'Fresado', 'Forjado', 'Soldadura'], correcta: 2 },
          { id: 7, pregunta: 'Que es el control de calidad?', opciones: ['Un tipo de maquina', 'Proceso para verificar que los productos cumplan estandares', 'Una materia de diseno', 'Un tipo de material'], correcta: 1 },
          { id: 8, pregunta: 'Que software se utiliza comunmente para diseno tecnico 3D?', opciones: ['Microsoft Word', 'AutoCAD / SolidWorks', 'Photoshop', 'Excel'], correcta: 1 },
          { id: 9, pregunta: 'Que es una norma ISO?', opciones: ['Un tipo de tornillo', 'Estandar internacional para procesos y productos', 'Una empresa de computadoras', 'Un tipo de material'], correcta: 1 },
          { id: 10, pregunta: 'Que es un plano isometrico?', opciones: ['Un plano 2D comun', 'Representacion 3D donde los ejes forman 120 grados', 'Un plano sin medidas', 'Un plano solo para arquitectura'], correcta: 1 }
        ]
      },
      {
        id: 3,
        capacitacion: 'Diseno Grafico Publicitario',
        titulo: 'Evaluacion Diseno Grafico Publicitario',
        preguntas: [
          { id: 1, pregunta: 'Que es la jerarquia tipografica?', opciones: ['Todas las fuentes iguales', 'Organizacion visual del texto por importancia', 'Usar solo una fuente', 'Tamano uniforme del texto'], correcta: 1 },
          { id: 2, pregunta: 'Que color tiene mayor contraste con el blanco?', opciones: ['Gris claro', 'Amarillo', 'Negro', 'Beige'], correcta: 2 },
          { id: 3, pregunta: 'Que es el branding?', opciones: ['Un tipo de imprenta', 'Proceso de crear identidad de marca', 'Un programa de diseno', 'Una tecnica de impresion'], correcta: 1 },
          { id: 4, pregunta: 'Cual es la resolucion minima recomendada para impresion?', opciones: ['72 DPI', '150 DPI', '300 DPI', '50 DPI'], correcta: 2 },
          { id: 5, pregunta: 'Que formato de archivo es ideal para imagenes con transparencia?', opciones: ['JPG', 'BMP', 'PNG', 'TIFF'], correcta: 2 },
          { id: 6, pregunta: 'Que es la regla de los tercios?', opciones: ['Una regla de matematica', 'Guia de composicion que divide el area en 9 partes', 'Una ley de copyright', 'Un tipo de fuente'], correcta: 1 },
          { id: 7, pregunta: 'Que espacio de color se utiliza para impresion?', opciones: ['RGB', 'CMYK', 'HEX', 'HSL'], correcta: 1 },
          { id: 8, pregunta: 'Que es un briefing de diseno?', opciones: ['Una factura', 'Documento con los requisitos y objetivos del proyecto', 'Un tipo de logo', 'Un programa de edicion'], correcta: 1 },
          { id: 9, pregunta: 'Que es la psicologia del color en diseno?', opciones: ['Estudiar colores en la naturaleza', 'Como los colores influyen en las emociones y percepciones', 'Mezclar colores en pantalla', 'Un tipo de filtro'], correcta: 1 },
          { id: 10, pregunta: 'Que es un mockup?', opciones: ['Un borrador informal', 'Representacion visual realista de un diseno', 'Un tipo de imprenta', 'Un programa de codigo'], correcta: 1 }
        ]
      },
      {
        id: 4,
        capacitacion: 'Diagnostico y Mantenimiento de PC',
        titulo: 'Evaluacion Diagnostico y Mantenimiento de PC',
        preguntas: [
          { id: 1, pregunta: 'Cual es la diferencia entre gabinete y CPU?', opciones: ['Son sinonimos', 'Gabinete es la caja; CPU es el chip dentro', 'CPU es la caja y gabinete es el chip', 'Son lo mismo, cambia el nombre segun fabricante'], correcta: 1 },
          { id: 2, pregunta: 'Que tipo de memoria es mas rapida, RAM o HDD?', opciones: ['HDD', 'RAM', 'Ambas son iguales', 'Depende del uso'], correcta: 1 },
          { id: 3, pregunta: 'Que componente almacena el BIOS/UEFI?', opciones: ['Disco duro', 'Tarjeta de video', 'ROM/EEPROM en la motherboard', 'Memoria RAM'], correcta: 2 },
          { id: 4, pregunta: 'Que puede causar que una PC se apague repentinamente?', opciones: ['Exceso de archivos', 'Sobrecalentamiento', 'Poca RAM', 'Teclado defectuoso'], correcta: 1 },
          { id: 5, pregunta: 'Que protocolo se utiliza para asignar direcciones IP automaticamente?', opciones: ['FTP', 'DNS', 'DHCP', 'SMTP'], correcta: 2 },
          { id: 6, pregunta: 'Que mantenimiento preventivo se recomienda realizar periodicamente?', opciones: ['Cambiar el procesador', 'Limpiar polvo, verificar temperaturas, actualizar software', 'Reemplazar la motherboard', 'Formatear cada semana'], correcta: 1 },
          { id: 7, pregunta: 'Que herramienta del sistema verifica la integridad de archivos?', opciones: ['Paint', 'CHKDSK / SFC', 'Notepad', 'Calculator'], correcta: 1 },
          { id: 8, pregunta: 'Cual es el primer paso al formatear un disco duro?', opciones: ['Instalar Windows', 'Hacer backup de los datos importantes', 'Borrar el escritorio', 'Desconectar la pantalla'], correcta: 1 },
          { id: 9, pregunta: 'Que es la herramienta Administrador de Tareas de Windows?', opciones: ['Un programa de edicion', 'Permite ver procesos, rendimiento y servicios del sistema', 'Un juego', 'Un antivirus'], correcta: 1 },
          { id: 10, pregunta: 'Que significa POST en una computadora?', opciones: ['Publicar en redes', 'Power-On Self-Test (autodiagnostico al encender)', 'Un tipo de virus', 'Un programa de oficina'], correcta: 1 }
        ]
      },
      {
        id: 5,
        capacitacion: 'Asistente Administrativo con IA',
        titulo: 'Evaluacion Asistente Administrativo con IA',
        preguntas: [
          { id: 1, pregunta: 'Que funcion de Excel permite buscar datos en una tabla?', opciones: ['SUM', 'VLOOKUP / BUSCARV', 'COUNT', 'CONCATENAR'], correcta: 1 },
          { id: 2, pregunta: 'Cual es la importancia de clasificar documentos?', opciones: ['No tiene importancia', 'Facilita el acceso rapido y organizado a la informacion', 'Para llenar carpetas', 'Es opcional'], correcta: 1 },
          { id: 3, pregunta: 'Que herramienta de IA puede resumir textos automaticamente?', opciones: ['Calculadora', 'ChatGPT / asistentes de IA', 'Paint', 'WinRAR'], correcta: 1 },
          { id: 4, pregunta: 'Que protocolo se recomienda para comunicacion interna?', opciones: ['No comunicarse', 'Canales formales, emails institucionales, reportes', 'Redes sociales personales', 'Mensajes de texto'], correcta: 1 },
          { id: 5, pregunta: 'Que formato es ideal para bases de datos estructuradas?', opciones: ['PDF', 'Excel / CSV', 'JPEG', 'MP3'], correcta: 1 },
          { id: 6, pregunta: 'Como se organiza eficientemente un calendario de eventos?', opciones: ['De memoria', 'Usando herramientas digitales con recordatorios y prioridades', 'En un papel y guardarlo', 'No es necesario'], correcta: 1 },
          { id: 7, pregunta: 'Que elementos debe contener un informe ejecutivo?', opciones: ['Solo numeros', 'Resumen, datos clave, analisis y recomendaciones', 'Solo texto largo', 'imagenes decorativas'], correcta: 1 },
          { id: 8, pregunta: 'Que tecnica ayuda a gestionar el tiempo de trabajo?', opciones: ['Trabajar sin descanso', 'Metodo Pomodoro / matriz de Eisenhower', 'No planificar', 'Hacer todo a la vez'], correcta: 1 },
          { id: 9, pregunta: 'Que es un CRM?', opciones: ['Un tipo de virus', 'Sistema de gestion de relaciones con clientes', 'Un programa de diseno', 'Una red social'], correcta: 1 },
          { id: 10, pregunta: 'Que ventaja ofrece la automatizacion con IA en administracion?', opciones: ['Reemplaza totalmente al humano', 'Reduce tareas repetitivas y mejora precision', 'No tiene ventajas', 'Solo sirve para juguetes'], correcta: 1 }
        ]
      },
      {
        id: 6,
        capacitacion: 'Administracion de PyMEs',
        titulo: 'Evaluacion Administracion de PyMEs',
        preguntas: [
          { id: 1, pregunta: 'Que componente es fundamental en un plan de negocios?', opciones: ['Solo el nombre', 'Analisis de mercado, modelo de financiamiento y proyecciones', 'Un logo bonito', 'Una oficina grande'], correcta: 1 },
          { id: 2, pregunta: 'Que es el flujo de caja (cash flow)?', opciones: ['El dinero que se gasta', 'Registro de entradas y salidas de dinero en un periodo', 'El precio de los productos', 'Una cuenta de ahorro'], correcta: 1 },
          { id: 3, pregunta: 'Que estrategia de marketing es mas economica para PyMEs?', opciones: ['Publicidad en TV', 'Marketing digital y redes sociales', 'Billboards', 'Radio nacional'], correcta: 1 },
          { id: 4, pregunta: 'Que aspecto legal es obligatorio al iniciar un negocio?', opciones: ['Ninguno', 'Registro comercial, inscripcion fiscal, permisos locales', 'Solo tener una pagina web', 'Ninguno si es pequeno'], correcta: 1 },
          { id: 5, pregunta: 'Que sistema se utiliza para controlar el stock de productos?', opciones: ['Memoria', 'Sistema de inventario / planificacion de recursos (ERP)', 'Red social', 'Correo electronico'], correcta: 1 },
          { id: 6, pregunta: 'Que es el CRM y para que sirve?', opciones: ['Un tipo de producto', 'Gestionar y mejorar la relacion con los clientes', 'Un programa de diseno', 'Un tipo de impuesto'], correcta: 1 },
          { id: 7, pregunta: 'Que porcentaje de ingresos se recomienda invertir en marketing?', opciones: ['0%', 'Entre 5% y 15%', '50%', '100%'], correcta: 1 },
          { id: 8, pregunta: 'Que estrategia ayuda a fidelizar clientes?', opciones: ['Subir precios', 'Programas de fidelizacion, atencion personalizada y calidad', 'No responder consultas', 'Cambiar de nombre frecuentemente'], correcta: 1 },
          { id: 9, pregunta: 'Que es la facturacion electronica?', opciones: ['Enviar emails con facturas', 'Emision de comprobantes fiscales en formato digital', 'Una red social', 'Un tipo de producto'], correcta: 1 },
          { id: 10, pregunta: 'Que es la indentacion fiscal para una PyME?', opciones: ['Pagar impuestos dobles', 'Beneficios y deducciones que el Estado ofrece a pequenos negocios', 'No pagar impuestos nunca', 'Un tipo de multa'], correcta: 1 }
        ]
      }
    ],
    intentos: [],
    nextUserId: 2,
    refreshTokens: []
  };
}

function readDB() {
  if (memoryDB) return memoryDB;
  try {
    memoryDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return memoryDB;
  } catch {
    memoryDB = seedData();
    return memoryDB;
  }
}

function persist() {
  process.nextTick(() => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB || seedData(), null, 2));
    } catch {}
  });
}

function writeDB() {
  persist();
  return memoryDB;
}

function resetDB() {
  memoryDB = seedData();
  return memoryDB;
}

// Alias usado desde los servicios/controllers
function getDB() {
  return readDB();
}

module.exports = {
  readDB,
  getDB,
  writeDB,
  resetDB,
  getNextId,
  seedData
};
