// TEXTOS LEGALES — se arman con los datos reales de la app (lib/legal.ts, lib/oferta.ts, lib/marca.ts).
// Así un cambio de precio, prueba, garantía o conservación se refleja solo en las cinco páginas y los
// números nunca se contradicen entre la landing, el paywall y los documentos (lo vigilan las pruebas).

import { COMPROMISOS_LEGALES_CUMPLIDOS, LEGAL, emailLegal, leyAplicable, quienSomos, type LegalBlock, type LegalSection, type TextoLegal } from './legal';
import { MARCA } from './marca';
import {
  CORREOS_CONECTADOS,
  DATOS_CONSERVACION_CONFIRMADA,
  DIAS_CONSERVAR_DATOS,
  GARANTIA_DIAS,
  PRECIO_ANIO,
  PRECIO_MES,
  RENOVACION_REEMBOLSO_DIAS,
  TRIAL_DIAS,
  tieneTrial,
  usd,
} from './oferta';

// Cada promesa que la plantilla todavía no cumple sale SOLO cuando su bandera está en true (lib/oferta.ts,
// lib/legal.ts, lib/marca.ts → conexiones). Así ningún texto legal promete algo que la app no hace.
const CONECTADO = MARCA.conexiones.supabase;
// Un proveedor recibe datos solo si hay un servicio conectado que los envía (base de datos, correo o cobro).
const HAY_PROVEEDORES = CONECTADO || MARCA.conexiones.resend || MARCA.conexiones.hotmart;

const N = MARCA.nombre;
const lista = (...items: string[]): LegalBlock => ({ list: items });

/* ───────────────────────── PRIVACIDAD ───────────────────────── */
export function privacidad(): TextoLegal {
  const proveedores = LEGAL.proveedores.map((p) => `${p.nombre}: ${p.funcion}. Servidores: ${p.ubicacion}.`);
  const secciones: LegalSection[] = [
    {
      id: 'responsable',
      title: 'Quién es el responsable de tus datos',
      blocks: [
        `${N} es una herramienta para que hermanos adultos coordinen el cuidado de un familiar mayor: medicinas, citas, novedades y un resumen para el médico. El responsable del tratamiento de tus datos es ${quienSomos}${LEGAL.domicilio ? `, con domicilio en ${LEGAL.domicilio}` : ''}.`,
        `Cuando decimos "nosotros" hablamos de ${quienSomos}. "Tú" es la persona que crea la cuenta. "Tu familiar" es la persona mayor a quien cuidan entre todos. Puedes escribirnos para cualquier tema de privacidad a ${emailLegal}.`,
      ],
    },
    {
      id: 'datos',
      title: 'Qué datos recogemos',
      blocks: [
        'Recogemos solo lo necesario para que el servicio funcione:',
        lista(
          CONECTADO
            ? 'Datos de tu cuenta: tu nombre, tu correo electrónico y tu contraseña. La contraseña se guarda protegida (cifrada de forma irreversible): nadie de nuestro equipo puede leerla.'
            : 'Datos de tu cuenta: hoy la aplicación no crea cuentas reales y no guarda contraseñas.',
          'Datos de tu círculo familiar: el nombre y el correo de los hermanos que invitas y el papel de cada uno en el cuidado.',
          'Datos de tu familiar que tú decides escribir: nombre, edad, alergias, condiciones de salud, medicinas con dosis y horarios, citas médicas, notas de la bitácora, y el nombre y teléfono de su médico y de su contacto de emergencia.',
          'Actividad dentro del círculo: quién confirmó cada dosis o anotó que no se dio, a qué hora, y quién escribió cada nota.',
          'Datos de suscripción: el estado de tu plan y el correo con el que compraste. No vemos ni guardamos los datos de tu tarjeta: los recibe directamente el procesador de pagos.',
          'Datos técnicos mínimos: tipo de navegador, idioma y errores de la aplicación, para mantenerla estable.',
        ),
        'No pedimos tu ubicación, tu fecha de nacimiento, ni documentos de identidad. Tampoco los necesitas para usar el servicio.',
      ],
    },
    {
      id: 'salud',
      title: 'Los datos de salud de tu familiar',
      blocks: [
        'La información de salud es un dato sensible y merece un cuidado especial. En este servicio esos datos son de tu familiar, no nuestros: los guardamos únicamente para prestarte el servicio.',
        'Antes de crear tu cuenta te pedimos una autorización aparte para estos datos, separada de la aceptación de los términos. Con ella declaras que eres su familiar o cuidador y que tienes su autorización, o el derecho de cuidarlo, para anotarlos y compartirlos con las personas que invites.',
        'Puedes retirar esa autorización cuando quieras borrando los datos o tu cuenta. Retirarla no afecta lo que se hizo antes de retirarla.',
        'Te recomendamos anotar solo lo útil para el cuidado diario: no hace falta escribir números de documento, claves ni datos bancarios de tu familiar.',
      ],
    },
    {
      id: 'usos',
      title: 'Para qué usamos tus datos y con qué base',
      blocks: [
        lista(
          'Darte acceso a tu cuenta y mantenerla segura (para cumplir el servicio que contrataste).',
          'Mostrar a todo tu círculo familiar las medicinas, citas y novedades, y quién hizo cada cosa (para cumplir el servicio).',
          'Enviarte recordatorios de dosis y citas si activas esa función (con tu autorización).',
          'Preparar el resumen para el médico: solo se arma cuando tú lo pides y nunca se envía sin tu aprobación.',
          ...(tieneTrial
            ? ['Gestionar tu suscripción, tu prueba gratis y los reembolsos (para cumplir el contrato y las obligaciones de cobro).']
            : ['Gestionar tu suscripción y los reembolsos (para cumplir el contrato y las obligaciones de cobro).']),
          'Responder tus mensajes de soporte y avisarte de cambios importantes del servicio.',
          'Mejorar el producto con datos de uso agregados y sin nombres, medicinas ni notas.',
        ),
        'No usamos los datos de salud de tu familiar para publicidad, no los vendemos, no los usamos para perfilarte y no tomamos decisiones automáticas sobre ti con ellos.',
        'Los mensajes de retención (por ejemplo, un resumen semanal o un aviso de pago pendiente) nunca incluyen nombres de medicinas ni datos clínicos. ' +
          (COMPROMISOS_LEGALES_CUMPLIDOS
            ? 'Los que no son del servicio puedes dejar de recibirlos con el enlace de baja que traen.'
            : 'Mientras la baja automática no esté activa, no enviamos mensajes que no sean del servicio.'),
      ],
    },
    {
      id: 'compartir',
      title: 'Con quién compartimos los datos',
      blocks: [
        CONECTADO
          ? 'Lo que registras solo lo ve tu círculo familiar, es decir, las personas que tú invitas. Tú decides quién entra y cualquiera de ellas puede ver las medicinas, citas y notas de ese círculo.'
          : 'Hoy lo que registras se guarda solo en el navegador de este dispositivo y no se envía a ningún servidor. La app no comparte tus datos con otras personas por sí sola: si tú compartes el resumen para el médico o un mensaje de invitación, lo haces desde tu teléfono.',
        HAY_PROVEEDORES
          ? 'Para operar el servicio trabajamos con estos proveedores. Cada uno recibe solo lo necesario para su función:'
          : 'Hoy no enviamos tus datos a ningún proveedor: se quedan en el navegador de este dispositivo.',
        ...(HAY_PROVEEDORES ? [lista(...proveedores)] : []),
        LEGAL.usaIA
          ? 'Algunas funciones usan un servicio de inteligencia artificial. Lo que escribes en ellas se envía a ese proveedor para procesarlo; no incluyas contraseñas ni datos financieros en esos campos.'
          : 'No usamos inteligencia artificial para tratar los datos de tu familiar ni de tu cuenta.',
        'No vendemos tus datos. Solo los entregaríamos a una autoridad si una ley o una orden válida nos obliga, y limitaremos lo entregado a lo estrictamente exigido.',
      ],
    },
    {
      id: 'transferencias',
      title: 'Transferencias a otros países',
      blocks: HAY_PROVEEDORES
        ? [
            'Los proveedores de arriba pueden tener servidores en otros países, incluido Estados Unidos. Eso significa que tus datos pueden tratarse fuera del país donde vives.',
            'Lo hacemos solo para prestar el servicio y bajo contratos que exigen medidas de seguridad equivalentes. Al aceptar esta política y usar el servicio autorizas esa transferencia.',
          ]
        : ['Hoy tus datos no salen del navegador de este dispositivo, así que no hay transferencias a otros países.'],
    },
    {
      id: 'tiempo',
      title: 'Cuánto tiempo guardamos los datos',
      blocks: [
        'Guardamos tus datos mientras tu cuenta esté activa. Si cancelas la suscripción, ' +
          (DATOS_CONSERVACION_CONFIRMADA
            ? 'conservamos la información hasta ' + DIAS_CONSERVAR_DATOS + ' días por si quieres volver, y después la borramos.'
            : 'podrás pedir una copia de tus datos y su borrado escribiendo a ' + emailLegal + '.'),
        'Hay una excepción: lo que una ley nos obligue a conservar más tiempo, como los comprobantes y registros de pago. Esos registros no incluyen datos de salud.',
        'Si pides eliminar tu cuenta, el borrado alcanza a las notas, medicinas, citas e historial de dosis de tu círculo, salvo lo que otros hermanos sigan usando con su propia cuenta.',
      ],
    },
    {
      id: 'derechos',
      title: 'Tus derechos y cómo ejercerlos',
      blocks: [
        'Tienes derecho a:',
        lista(
          'Acceder a los datos que guardamos sobre ti.',
          'Corregir los datos equivocados (buena parte los editas tú mismo desde la aplicación).',
          'Eliminar tu cuenta y tus datos.',
          'Oponerte a un uso concreto o retirar un permiso que diste.',
          'Recibir una copia de tus datos en un formato que puedas llevarte (portabilidad).',
        ),
        'Desde la aplicación, en Familia, en la sección "Tus datos", puedes descargar una copia de lo que tienes guardado o borrar los datos guardados en tu dispositivo, sin pedirnos nada.',
        `Para cerrar tu cuenta y borrar lo que está en nuestros servidores, o para cualquier otro derecho, escríbenos a ${emailLegal} desde el correo de tu cuenta. Te respondemos en un máximo de 15 días hábiles.`,
        `Si crees que no respetamos tus derechos, puedes acudir a la autoridad de protección de datos de tu país. Aplicamos ${leyAplicable} en materia de datos personales.`,
      ],
    },
    {
      id: 'seguridad',
      title: 'Cómo cuidamos tus datos',
      blocks: [
        lista(
          CONECTADO
            ? 'La comunicación entre tu dispositivo y nuestros servidores viaja cifrada.'
            : 'Hoy la app no envía tus datos a ningún servidor.',
          CONECTADO
            ? 'Las contraseñas se guardan protegidas y nunca en texto legible.'
            : 'Hoy la app no guarda contraseñas: no hay cuentas reales.',
          CONECTADO
            ? 'Cada círculo familiar solo puede ver sus propios datos: una cuenta ajena no puede abrir la información de tu familiar.'
            : 'Hoy los datos se quedan en este dispositivo: no hay servidor ni cuentas que otra persona pueda consultar desde la app.',
          CONECTADO
            ? 'Limitamos quién puede acceder a los sistemas y solo por motivos de soporte.'
            : 'Hoy no hay un servidor de datos: nadie del equipo puede consultar lo que anotas en tu dispositivo.',
        ),
        'Ningún sistema es infalible. Si ocurre un incidente que afecte tus datos, te lo avisaremos por correo y, si la ley lo exige, a la autoridad, con qué pasó y qué te recomendamos hacer.',
      ],
    },
    {
      id: 'menores',
      title: 'Menores de edad',
      blocks: [
        `${N} es solo para personas mayores de 18 años. No creamos cuentas a menores ni recogemos sus datos de forma intencional. Si sabes de una cuenta de un menor, escríbenos a ${emailLegal} y la eliminamos.`,
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies y almacenamiento en tu dispositivo',
      blocks: [
        'Usamos almacenamiento en tu navegador solo para lo esencial: guardar tus datos de la aplicación' +
          (CONECTADO ? ' y mantener tu sesión' : '') + '. ' +
          (LEGAL.analiticaNoEsencial
            ? 'La medición de uso solo se activa si la aceptas y puedes rechazarla con la misma facilidad.'
            : 'No usamos cookies de publicidad ni de seguimiento.'),
        'En la página de Cookies encuentras el detalle de qué guardamos y cómo borrarlo.',
      ],
    },
    {
      id: 'cambios',
      title: 'Cambios a esta política',
      blocks: [
        'La fecha de arriba te dice cuándo fue la última actualización. Si el cambio es importante, te avisaremos por correo antes de que empiece a aplicarse, y si cambia para qué usamos tus datos, te pediremos tu permiso de nuevo.',
      ],
    },
    { id: 'contacto', title: 'Contacto', blocks: [`Para cualquier duda sobre tu privacidad escríbenos a ${emailLegal}.`] },
  ];
  return {
    titulo: 'Política de Privacidad',
    intro: 'Cuidar a un familiar mayor implica confiarnos información delicada. Aquí te explicamos, en palabras simples, qué guardamos, para qué, con quién y cómo la controlas.',
    aviso: {
      titulo: 'Tus datos de salud son tuyos',
      texto: 'No los vendemos, no los usamos para publicidad y puedes descargarlos o borrarlos cuando quieras.',
    },
    secciones,
  };
}

/* ───────────────────────── TÉRMINOS ───────────────────────── */
export function terminos(): TextoLegal {
  const secciones: LegalSection[] = [
    {
      id: 'servicio',
      title: `Qué es ${N} y qué no es`,
      blocks: [
        `${N} es una herramienta de organización, ofrecida por ${quienSomos}. Sirve para que varios familiares registren en un solo lugar las medicinas, las citas y las novedades del cuidado de una persona mayor, y para preparar un resumen que se pueda llevar al médico.`,
        'No es un servicio médico, no diagnostica, no recomienda tratamientos ni medicinas, y no reemplaza a ningún profesional de la salud. Lo que ves en la aplicación es lo que tú y tu familia escriben, no una indicación médica. Más detalle en el Aviso médico.',
      ],
    },
    {
      id: 'aceptacion',
      title: 'Aceptación y edad mínima',
      blocks: [
        'Al crear una cuenta marcas una casilla para aceptar estos términos y la Política de Privacidad. Si no estás de acuerdo, no uses el servicio. Debes ser mayor de 18 años y tener capacidad legal para aceptar estas condiciones.',
      ],
    },
    {
      id: 'cuenta',
      title: 'Tu cuenta y tu contraseña',
      blocks: [
        lista(
          'Debes dar un correo real al que tengas acceso y mantener tus datos al día.',
          'Elige una contraseña propia y difícil de adivinar. No la compartas con nadie, ni con tus hermanos: cada uno debe tener su propia cuenta.',
          'Eres responsable de lo que ocurra desde tu cuenta. Si crees que alguien entró sin permiso, cambia tu contraseña y escríbenos de inmediato.',
        ),
      ],
    },
    {
      id: 'circulo',
      title: 'El círculo familiar y los datos de tu familiar',
      blocks: [
        CONECTADO
          ? 'Tú decides quién forma parte de tu círculo. Todos los miembros pueden ver y editar la información de ese círculo, así que invita solo a personas de confianza.'
          : 'Hoy la información de tu familiar se guarda solo en este dispositivo y ninguna otra persona la ve desde la app. Si más adelante compartes el círculo con tus hermanos, todos sus miembros podrán ver y editar esa información, así que invita solo a personas de confianza.',
        'Al registrar datos de tu familiar declaras que eres su familiar o cuidador y que tienes su autorización, o el derecho de cuidarlo, para anotar y compartir esa información. Eres responsable de que lo que escribes sea correcto y esté actualizado.',
      ],
    },
    {
      id: 'uso',
      title: 'Uso aceptable',
      blocks: [
        'Te pedimos usar el servicio con respeto y solo para el cuidado familiar. No está permitido:',
        lista(
          'Usar la aplicación para algo ilegal, o para acosar, engañar o dañar a otras personas.',
          'Registrar datos de una persona sin autorización para hacerlo.',
          'Intentar entrar a cuentas o datos de otros círculos, ni alterar o sobrecargar el servicio.',
          'Copiar, revender o ceder tu acceso a terceros.',
        ),
        'Si se incumple esto podemos advertirte, suspender o cerrar la cuenta (ver "Suspensión y terminación").',
      ],
    },
    {
      id: 'recordatorios',
      title: 'Recordatorios y avisos',
      blocks: [
        'Los recordatorios de dosis y citas son una ayuda, no una garantía. Pueden fallar o llegar tarde por causas ajenas a nosotros: falta de conexión, un teléfono apagado o un correo que cae en no deseados.',
        'No dependas únicamente de la aplicación para cuidar la salud de tu familiar. Confirma siempre las indicaciones con su médico o farmacéutico.',
      ],
    },
    {
      id: 'planes',
      title: tieneTrial ? 'Planes, prueba gratis, renovación automática y cancelación' : 'Planes, renovación automática y cancelación',
      blocks: [
        `${N} se ofrece por suscripción: ${usd(PRECIO_MES)} al mes o ${usd(PRECIO_ANIO)} al año. El precio final, la moneda y los impuestos aplicables se te muestran en la pantalla de pago antes de que pagues, y pueden variar según tu país.`,
        lista(
          ...(tieneTrial
            ? [`Prueba gratis de ${TRIAL_DIAS} días: durante la prueba puedes usar todo el servicio. Si no cancelas antes de que termine, se hace el primer cobro del plan que elegiste, en la fecha exacta que se te muestra antes de empezar.`]
            : []),
          'Renovación automática: la suscripción se renueva sola cada mes o cada año hasta que la canceles, con el medio de pago que registraste. Esto se te dice antes de pagar.',
          ...(COMPROMISOS_LEGALES_CUMPLIDOS
            ? ['Aviso de renovación anual: si tu plan es anual, te escribimos por correo unos días antes del cobro, con la fecha y el importe, para que decidas con calma.']
            : []),
          `Cancelación: dentro de la aplicación, en "Tu suscripción", tienes el botón para cancelar, que te lleva al panel de compras de la pasarela de pago (Hotmart). También puedes escribirnos a ${emailLegal}. Mantienes el acceso hasta el final del período que ya pagaste y no se hacen más cobros.`,
          'Cambios de precio: si cambiamos los precios te avisamos por correo con anticipación, y solo aplican desde tu siguiente renovación.',
        ),
        'Las compras las procesa Hotmart, que puede actuar como vendedor frente a ti y se rige además por sus propias condiciones. Los reembolsos se rigen por la Política de Reembolsos.',
      ],
    },
    {
      id: 'comunicaciones',
      title: 'Comunicaciones',
      blocks: [
        CORREOS_CONECTADOS && COMPROMISOS_LEGALES_CUMPLIDOS
          ? 'Te enviaremos correos del servicio (acceso, cobros, cambios importantes), que no se pueden desactivar mientras tengas cuenta. Los demás (por ejemplo, el resumen semanal) traen un enlace para darte de baja y no los usamos para publicidad de terceros.'
          : 'Por ahora no enviamos correos de publicidad ni de retención. Si en el futuro enviamos correos, serán del servicio o con un enlace para darte de baja, y no los usamos para publicidad de terceros.',
      ],
    },
    {
      id: 'propiedad',
      title: 'Propiedad y contenido',
      blocks: [
        `La aplicación, su diseño, sus textos y su marca pertenecen a ${quienSomos} y están protegidos por las leyes de propiedad intelectual. Te damos un permiso personal, limitado y revocable para usarla mientras tu suscripción esté activa.`,
        'Los datos y notas que escribes siguen siendo tuyos. Nos autorizas a guardarlos y mostrarlos a tu círculo únicamente para prestarte el servicio, y puedes descargarlos cuando quieras.',
      ],
    },
    {
      id: 'disponibilidad',
      title: 'Disponibilidad y cambios del servicio',
      blocks: [
        'Trabajamos para que el servicio esté siempre disponible, pero puede haber interrupciones por mantenimiento o por fallos fuera de nuestro control. Podemos mejorar, cambiar o retirar funciones. Si un cambio te afecta de forma importante, te avisaremos con anticipación.',
      ],
    },
    {
      id: 'responsabilidad',
      title: 'Límites de nuestra responsabilidad',
      blocks: [
        'Prestamos el servicio "tal como está", con el cuidado razonable de una herramienta de organización. En la medida que la ley lo permita:',
        lista(
          'No somos responsables por decisiones de salud tomadas con base en lo que se registra en la aplicación.',
          'No somos responsables por dosis que se olviden, se repitan o se den mal, ni por citas que se pierdan, aunque hayan estado registradas.',
          'No somos responsables por datos incorrectos escritos por ti o por otros miembros de tu círculo.',
          'Nuestra responsabilidad total frente a ti se limita al valor que hayas pagado por el servicio en los 12 meses anteriores al hecho.',
        ),
        'Nada de lo anterior limita lo que la ley no permite limitar: los derechos irrenunciables del consumidor ni la responsabilidad por dolo o negligencia grave.',
      ],
    },
    {
      id: 'terminacion',
      title: 'Suspensión y terminación',
      blocks: [
        (COMPROMISOS_LEGALES_CUMPLIDOS
          ? 'Puedes dejar de usar el servicio y eliminar tu cuenta cuando quieras.'
          : 'Puedes dejar de usar el servicio y pedir el cierre de tu cuenta escribiendo a ' + emailLegal + '.') +
          ' Podemos suspender o cerrar una cuenta si se incumplen estos términos, si hay un uso que ponga en riesgo a otras personas o si hay un contracargo por fraude. Cuando sea posible te avisaremos antes y podrás corregirlo. Si cerramos tu cuenta sin que hayas incumplido, te devolvemos la parte ya pagada que no hayas usado.',
      ],
    },
    {
      id: 'ley',
      title: 'Ley aplicable y disputas',
      blocks: [
        `Estos términos se rigen por ${leyAplicable}. Si surge un desacuerdo, primero intentaremos resolverlo contigo a través de ${emailLegal}. Si no es posible, lo resolverán los tribunales competentes${LEGAL.pais ? ` de ${LEGAL.pais}` : ' de ese país'}, sin perjuicio de los derechos que tengas como consumidor en el lugar donde vives.`,
      ],
    },
    {
      id: 'cambios',
      title: 'Cambios a estos términos',
      blocks: [
        'Podemos actualizar estos términos. Te avisaremos por correo antes de que un cambio importante empiece a aplicarse. Si sigues usando el servicio después de esa fecha, entendemos que aceptas la versión nueva; si no estás de acuerdo, puedes cancelar tu suscripción.',
      ],
    },
    { id: 'contacto', title: 'Contacto', blocks: [`Escríbenos a ${emailLegal} para cualquier duda sobre estos términos.`] },
  ];
  return {
    titulo: 'Términos y Condiciones',
    intro: 'Estas son las reglas para usar la aplicación. Están escritas para que las entiendas a la primera y sepas qué esperar de nosotros y qué esperamos de ti.',
    aviso: {
      titulo: `${N} no reemplaza la atención médica`,
      texto:
        'La aplicación sirve para organizar el cuidado, no para decidir tratamientos. No sustituye la consulta con un médico ni sus indicaciones. Ante cualquier síntoma o duda sobre una medicina, habla con su médico. En una urgencia, llama al número de emergencias de tu país.',
    },
    secciones,
  };
}

/* ───────────────────────── REEMBOLSOS ───────────────────────── */
export function reembolsos(): TextoLegal {
  const secciones: LegalSection[] = [
    {
      id: 'garantia',
      title: `Garantía de ${GARANTIA_DIAS} días sobre el primer cobro`,
      blocks: [
        `Si ${N} no es lo que esperabas, te devolvemos el dinero. Tienes ${GARANTIA_DIAS} días, contados desde el día en que se hizo tu primer cobro, para pedir el reembolso completo de ese pago. No tienes que explicar por qué.`,
        GARANTIA_DIAS > 7
          ? 'Esta garantía la gestiona la pasarela de pago (Hotmart) y aplica al primer pago de tu suscripción, sea mensual o anual. Incluye y supera el derecho de arrepentimiento de 7 días que la pasarela aplica a las compras a distancia.'
          : 'Esta garantía la gestiona la pasarela de pago (Hotmart) y aplica al primer pago de tu suscripción, sea mensual o anual. Coincide con el derecho de arrepentimiento de 7 días que la pasarela aplica a las compras a distancia.',
      ],
    },
    ...(tieneTrial
      ? [
          {
            id: 'prueba',
            title: `La prueba gratis de ${TRIAL_DIAS} días`,
            blocks: [
              `Antes del primer cobro tienes ${TRIAL_DIAS} días de prueba sin costo. Si cancelas durante la prueba, no se te cobra nada y no hay nada que reembolsar. La garantía de ${GARANTIA_DIAS} días empieza a contar cuando se hace el primer cobro, es decir, cuando termina la prueba.`,
            ],
          },
        ]
      : []),
    {
      id: 'que-si-que-no',
      title: 'Qué se reembolsa y qué no',
      blocks: [
        lista(
          `Sí se reembolsa: el primer pago de tu suscripción, si lo pides dentro de los ${GARANTIA_DIAS} días desde ese cobro.`,
          `Sí se reembolsa: una renovación que no esperabas, si lo pides dentro de los ${RENOVACION_REEMBOLSO_DIAS} días desde ese cobro. Por eso te avisamos antes de renovar, sobre todo en el plan anual.`,
          'No se reembolsa el tiempo ya usado de un período por el que no pediste devolución a tiempo; al cancelar mantienes el acceso hasta que termine.',
        ),
        'Si por un error nuestro o de la pasarela recibes un cobro duplicado o que no autorizaste, escríbenos y lo corregimos aunque estén fuera de esos plazos.',
      ],
    },
    {
      id: 'como-pedirlo',
      title: 'Cómo pedir tu reembolso',
      blocks: [
        `La solicitud que haces dentro de los ${GARANTIA_DIAS} días la gestiona Hotmart, que cobra y reembolsa tu suscripción. No hay otro proceso: entra a tu área de compras de Hotmart con el correo con el que pagaste, busca ${N} y elige la opción de pedir reembolso.`,
        `Si no encuentras esa opción, escríbenos a ${emailLegal} desde el correo con el que compraste y te orientamos para usar ese mismo proceso de Hotmart.`,
        'Pídelo antes de que se cumpla el plazo. Si escribes el último día, incluye la fecha de tu cobro para que te orientemos a tiempo.',
      ],
    },
    {
      id: 'plazos',
      title: 'Cuánto tarda en llegar el dinero',
      blocks: [
        'Una vez aprobado, el reembolso vuelve por el mismo medio con el que pagaste. El tiempo exacto depende de la pasarela de pago y de tu banco: en una tarjeta puede aparecer en tu estado de cuenta en el siguiente ciclo de facturación. Si pasa más de un mes y no lo ves, escríbenos y lo revisamos contigo.',
      ],
    },
    {
      id: 'acceso',
      title: 'Qué pasa con tu acceso y tus datos',
      blocks: [
        `Al aprobarse el reembolso se cancela la suscripción y se cierra el acceso a la aplicación. Si quieres una copia de tus datos o que los eliminemos, escríbenos a ${emailLegal} y lo hacemos según la Política de Privacidad. Antes de irte puedes descargar tus datos desde Familia, en "Tus datos".`,
      ],
    },
    {
      id: 'cancelar',
      title: 'Cómo cancelar sin pedir reembolso',
      blocks: [
        'Puedes cancelar cuando quieras y sin dar explicaciones: dentro de la aplicación, en "Tu suscripción", o desde tu área de compras de Hotmart. No se harán más cobros y conservas el acceso hasta el final del período ya pagado.',
      ],
    },
    {
      id: 'derechos',
      title: 'Tus derechos como consumidor',
      blocks: [
        'Esta política no limita los derechos que tengas por la ley de consumo de tu país, como el derecho de retracto en compras a distancia ni las garantías legales.',
      ],
    },
    { id: 'contacto', title: 'Contacto', blocks: [`Si algo de este proceso no te queda claro, escríbenos a ${emailLegal} y te ayudamos.`] },
  ];
  return {
    titulo: 'Política de Reembolsos',
    intro: 'Queremos que pruebes la app sin miedo. Si no te sirve, te devolvemos tu dinero. Aquí explicamos cómo funciona.',
    secciones,
  };
}

/* ───────────────────────── COOKIES ───────────────────────── */
export function cookies(): TextoLegal {
  const secciones: LegalSection[] = [
    {
      id: 'que-son',
      title: 'Qué guardamos en tu dispositivo',
      blocks: [
        'Para funcionar, la aplicación guarda pequeños datos en tu navegador (almacenamiento local' +
          (CONECTADO ? ' y, al iniciar sesión, una cookie de sesión' : '') +
          '). Son imprescindibles: sin ellos no podrías entrar ni ver tus medicinas.',
        lista(
          'Datos de la aplicación (medicinas, citas, notas y preferencias): se guardan en tu dispositivo para que la app abra al instante.',
          ...(CONECTADO ? ['Sesión de acceso: mantiene tu cuenta abierta mientras la usas.'] : []),
          'Preferencia de cookies: recuerda si aceptaste o rechazaste la medición (solo existe si la medición está activa).',
        ),
        'Estos usos son esenciales y no requieren tu permiso, pero te los explicamos.',
      ],
    },
    {
      id: 'medicion',
      title: 'Medición y publicidad',
      blocks: LEGAL.analiticaNoEsencial
        ? [
            'Usamos una herramienta de medición para saber qué partes de la app se usan y mejorarla. Mide eventos generales (por ejemplo, que se abrió una pantalla) y nunca incluye nombres, medicinas, notas ni correos.',
            'Esta medición solo se activa si pulsas "Aceptar" en el aviso de cookies. "Rechazar" es igual de fácil y la app funciona igual. Puedes cambiar de opinión borrando los datos del sitio en tu navegador.',
          ]
        : [
            'No usamos cookies de publicidad, de seguimiento entre sitios ni herramientas de medición que identifiquen a las personas.',
            'Si en el futuro agregamos medición que no sea esencial, te lo pediremos antes con un aviso donde "Aceptar" y "Rechazar" son igual de fáciles, y no se cargará nada hasta que aceptes.',
          ],
    },
    {
      id: 'borrar',
      title: 'Cómo borrar lo guardado',
      blocks: [
        'Dentro de la aplicación, en Familia, en "Tus datos", puedes descargar una copia y borrar lo guardado en este dispositivo. También puedes borrar los datos del sitio desde la configuración de tu navegador.',
      ],
    },
    { id: 'contacto', title: 'Contacto', blocks: [`Si tienes dudas sobre este tema escríbenos a ${emailLegal}.`] },
  ];
  return {
    titulo: 'Política de Cookies',
    intro: 'Aquí te contamos, sin tecnicismos, qué guardamos en tu dispositivo y por qué.',
    secciones,
  };
}

/* ───────────────────────── AVISO MÉDICO ───────────────────────── */
// [VERIFICAR: revisión de profesional de salud] Texto de salud sin revisar por un profesional. Quita este marcador cuando lo revise.
export function avisoMedico(): TextoLegal {
  const secciones: LegalSection[] = [
    {
      id: 'que-es',
      title: 'Qué hace y qué no hace la aplicación',
      blocks: [
        `${N} ayuda a organizar: quién da cada medicina, a qué hora, qué citas vienen y qué novedades hubo. Todo lo que muestra lo escribieron tú y tu familia.`,
        lista(
          'No diagnostica ni interpreta síntomas.',
          'No recomienda, cambia ni receta medicinas o dosis.',
          'No sustituye la consulta, el criterio ni las indicaciones de un médico, enfermero o farmacéutico.',
          'No valida si una dosis o una combinación de medicinas es adecuada.',
        ),
      ],
    },
    {
      id: 'responsabilidad',
      title: 'Quién decide',
      blocks: [
        'Las decisiones sobre la salud de tu familiar las toman ustedes junto con sus profesionales de la salud, bajo su propia responsabilidad. Lo registrado en la app es un apoyo de memoria y coordinación.',
        'Ante cualquier duda sobre una medicina, un síntoma o un cambio, consulta a su médico antes de actuar.',
      ],
    },
    {
      id: 'urgencias',
      title: 'En una urgencia',
      blocks: ['Si hay una urgencia, no uses la aplicación: llama al número de emergencias de tu país o acude al servicio de urgencias más cercano.'],
    },
    {
      id: 'recordatorios',
      title: 'Recordatorios y resumen para el médico',
      blocks: [
        'Los recordatorios pueden fallar o llegar tarde, así que no dependas solo de ellos. El resumen para el médico reúne lo que ustedes registraron: revísalo antes de compartirlo, porque puede estar incompleto.',
      ],
    },
    {
      id: 'ia',
      title: 'Inteligencia artificial',
      blocks: [
        LEGAL.usaIA
          ? 'Algunas funciones usan inteligencia artificial. Sus respuestas son orientación y pueden ser incorrectas o incompletas: verifícalas con un profesional antes de decidir.'
          : 'La aplicación no usa inteligencia artificial para dar indicaciones de salud.',
      ],
    },
    { id: 'contacto', title: 'Contacto', blocks: [`Escríbenos a ${emailLegal} si algo de este aviso no te queda claro.`] },
  ];
  return {
    titulo: 'Aviso médico',
    intro: 'Cuidamos la organización del cuidado. La salud de tu familiar la cuidan sus médicos y ustedes.',
    aviso: {
      titulo: 'Esto no es consejo médico',
      texto: 'La aplicación no diagnostica, no receta y no reemplaza a un profesional de la salud. En una urgencia, llama a emergencias.',
    },
    secciones,
  };
}
