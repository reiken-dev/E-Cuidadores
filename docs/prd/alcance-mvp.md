# PRD del MVP de E-Cuidadores

Estado: borrador para revisión. Fecha: 2026-11-14.
Alcance: producto. No incluye diseño técnico, modelo de datos, arquitectura ni endpoints; eso se decide después.
Convención: lo que es una hipótesis sin respaldo se marca como **[SUPUESTO]**. No se citan cifras de mercado.

**Revisión de alcance (2026-11-14).** Por decisión del dueño, el MVP incluye el modo simple y todos los módulos y funcionalidades que la aplicación ya tiene desarrollados. Esto amplía el alcance respecto a la versión anterior de este documento: entran la vista semanal, las piezas de retención suave (novedades, racha, hitos), el plan anual con su flujo de cancelación y cupón, y el perfil y los ajustes. Siguen fuera las funciones que no existen hoy (ver sección 4.2).

---

## 1. Problema y contexto

### 1.1 El problema
Cuando varias personas de una misma familia cuidan a un paciente, la información que importa para cada consulta médica queda repartida y desordenada. Quien lleva al paciente a la consulta no sabe lo que pasó con los demás cuidadores: qué medicinas se tomaron, qué dijo el médico la vez anterior, qué quedó pendiente. Esa información vive en la memoria de alguien, en una libreta o en un chat.

Consecuencias que se observan:

- Se repite información que ya se dio al médico y se omite información importante por desconocimiento.
- No hay un registro fiable de las tomas. Los cuidadores solo "creen" que el paciente se tomó la medicina, y eso perjudica el seguimiento de su mejoría.
- Puede repetirse una dosis porque nadie sabe con certeza si ya se dio.
- El paciente muchas veces toma sus medicinas cuando no hay nadie presente, y esa toma no queda registrada.

### 1.2 Evidencia disponible
Relatos en comunidades de cuidadores describen familias que usan calendarios, notas compartidas y chats para seguir consultas, medicinas y pendientes, y señalan que la información entre profesionales y familiares depende de que una persona recuerde transmitirla. Esto muestra que el dolor existe. **No demuestra que alguien pague por resolverlo**: eso es lo que el MVP debe probar.

### 1.3 Contexto del producto hoy
E-Cuidadores parte de una plantilla que ya tiene landing, paywall, onboarding, páginas legales (borradores) y una aplicación completa de demostración: Hoy, Medicinas, Citas, Bitácora, Familia, Semana, resumen para el médico, modo simple y suscripción. Hoy todo se guarda en un solo navegador: no hay cuentas, no hay cobros reales, no hay correos y lo que anota un familiar no lo ve otro. El MVP consiste en convertir esa demostración en un producto que dos o más familiares puedan usar juntos y por el que se pueda pagar.

### 1.4 Fuera del problema del MVP
Gastos y compras entre cuidadores es un problema real, pero distinto y no está desarrollado. Se deja para una segunda versión.

---

## 2. Usuarios y jobs-to-be-done

### 2.1 Usuarios
| Usuario | Descripción | Rol en el MVP |
|---|---|---|
| **Cuidador organizador** | Hijo o hija (20 a 50 años, solvente) que coordina el cuidado de su madre o padre mayor junto con al menos otro familiar. | Usuario principal. Es quien crea el círculo y paga. |
| **Cuidador familiar** | Hermano, sobrino u otro integrante de la familia invitado al círculo. | Usuario. Anota y consulta. No paga. |
| **Paciente (persona mayor)** | Adulto mayor con medicinas regulares y consultas periódicas. | Usuario opcional: puede confirmar sus propias tomas mediante la vista simple. |

Mercado: hispanohablantes de Latinoamérica y Norteamérica. El primer país queda como decisión abierta (sección 10).

El lanzamiento se dirige a un solo rostro: el hijo o hija que coordina el cuidado de un padre o madre mayor. Adultos jóvenes con condiciones médicas y niños no son el mensaje principal.

### 2.2 Jobs-to-be-done
Formato: "Cuando…, quiero…, para…".

- **JTBD-1.** Cuando llevo a mi madre o padre a una consulta, quiero tener a mano lo que pasó desde la última vez, para no repetir información ni omitir algo importante.
- **JTBD-2.** Cuando no estoy con el paciente, quiero saber si ya se tomó una medicina, para no repetir una dosis ni suponer que se dio.
- **JTBD-3.** Cuando observo algo en el paciente (un síntoma, su ánimo), quiero dejarlo anotado, para que el próximo cuidador lo sepa sin que yo tenga que avisarle.
- **JTBD-4.** Cuando otro familiar cuida al paciente, quiero que vea lo mismo que yo, para que nadie dependa de la memoria de una sola persona.
- **JTBD-5.** Cuando termina una consulta, quiero dejar registrado lo que se dijo y lo que quedó pendiente, para que el siguiente cuidador lo use.
- **JTBD-6.** Cuando es hora de mi medicina y estoy solo, quiero confirmarla con un solo toque, sin entender menús, para que mi familia sepa que la tomé.
- **JTBD-7.** Cuando pasa la semana, quiero ver lo que logró la familia y quién ayudó, para sentir que cuidamos como equipo y seguir haciéndolo.

---

## 3. Propuesta de valor

> Llega a cada consulta sabiendo lo mismo que el resto de la familia, y deja de preguntarte si se tomó la medicina.

El MVP vale solo si cumple dos condiciones:

1. **El registro de tomas es confiable:** se sabe qué se dio, cuándo y quién lo confirmó (un cuidador o la propia persona mayor), y si no se dio, por qué.
2. **Lo que anota un familiar lo ve el resto del círculo.**

La segunda condición es requisito para abrir la venta. Sin ella el producto sería un cuaderno individual y no probaría la hipótesis.

Con el modo simple, la propia persona mayor puede dejar constancia de sus tomas cuando está sola. Eso cubre la parte del problema que un registro hecho solo por cuidadores no alcanza.

Diferencial frente a lo que las familias usan hoy (chat, notas, calendario) **[SUPUESTO]**: el registro de tomas con autor y motivo, la confirmación directa del paciente y la hoja para llevar a la consulta, que un chat no ofrece de forma ordenada.

---

## 4. Alcance y fuera de alcance

### 4.1 Dentro del alcance
| Pieza | Qué incluye |
|---|---|
| Círculo familiar | Una persona crea el círculo del paciente e invita a familiares. Todos los miembros ven y anotan lo mismo. Incluye la tarjeta de invitación para compartir. |
| Medicinas y tomas | Alta, edición, pausa y eliminación de medicinas con horario. Confirmar quién dio cada toma, o anotar que no se dio y por qué. Historial por medicina y resumen de adherencia de la semana. |
| Citas | Fecha, especialista, lugar, quién acompaña y qué ocurrió en la consulta. Próximas y pasadas, con navegación por meses. |
| Bitácora | Notas cortas de síntomas, ánimo y comida, con autor y hora. Filtros por tipo y por miembro. |
| Hoy | Pantalla principal: próxima toma y quién la da, línea del día, próxima cita y última novedad de la bitácora. |
| Modo simple | Vista para la persona mayor: letra muy grande, alto contraste y una sola acción ("Ya la tomé"). |
| Semana del círculo | Resumen de siete días: lo que logró la familia, quién ayudó y qué viene. |
| Novedades y constancia | Lo que pasó desde la última visita, racha del círculo, hitos y guía de primeros pasos. |
| Hoja para la consulta | Resumen sobrio, imprimible, con alergias, medicinas, horarios y dosis registradas. |
| Perfil y ajustes | Datos del paciente, preferencias de aviso por defecto, activar el modo simple, exportar datos y borrar los datos del dispositivo. |
| Cuenta y suscripción | Acceso con cuenta; planes mensual y anual; administrar el medio de pago; cancelar con una pregunta y ayuda honesta; cupón de regreso. |
| Piloto gratuito | Acceso sin pago para familiares del piloto. |
| Entrada y venta | Landing, onboarding, páginas legales. |

### 4.2 Fuera del alcance, con justificación
1. **Gastos y compras entre cuidadores.** Problema distinto, con más fricción emocional (dinero entre familiares), y no existe desarrollado.
2. **Pacientes que no sean adultos mayores.** Cada grupo cambia el lenguaje, el tono y las preocupaciones. Un solo rostro permite probar con menos ruido.
3. **Envío real de avisos y recordatorios (correos, notificaciones).** Hoy la aplicación guarda las preferencias de aviso pero no envía nada. Hasta que exista, no puede prometerse (ver RF-53 y la sección 10).
4. **Varios círculos o varios pacientes por cuenta.** La mayoría de las familias cuida a una persona a la vez **[SUPUESTO]**.
5. **Roles y permisos diferenciados entre familiares.** Todos ven y anotan lo mismo. Se añadirán si aparece un conflicto real.
6. **Adjuntar documentos, recetas o fotos.** Cada archivo implica orden y privacidad. La bitácora en texto cubre lo mínimo.
7. **Integraciones con calendarios, teléfono o historias clínicas.** Dependen de terceros y de cada país.
8. **Otros idiomas y países con trámites propios.** Hay que elegir un primer mercado.
9. **Orientación clínica.** La app no diagnostica ni receta: registra lo que la familia hace. Es una línea que no se cruza.
10. **Funciones que no están desarrolladas hoy.** Por ejemplo: preguntas para el médico, y notas o condiciones dentro de la hoja para la consulta. No entran al MVP; quedan como decisión en la sección 10.

---

## 5. Épicas del MVP

Las nueve primeras siguen el orden de los módulos investigados. Las tres últimas recogen lo que se incorporó en la revisión de alcance.

| Épica | Módulo | Resultado esperado |
|---|---|---|
| **E1** | Acceso y cuenta | Una persona puede crear su cuenta, entrar y volver a su círculo. |
| **E2** | Círculo familiar | Varios familiares comparten un mismo círculo y ven lo mismo. |
| **E3** | Medicinas y tomas | La familia sabe qué se dio, cuándo, quién y, si no se dio, por qué. |
| **E4** | Citas | La familia registra las consultas y lo que pasó en ellas. |
| **E5** | Bitácora | Cualquier miembro deja observaciones que el resto lee. |
| **E6** | Hoja para la consulta | Quien lleva al paciente sale con una hoja lista, sin armarla a mano. |
| **E7** | Suscripción y cobro | El organizador puede pagar, administrar y cancelar su plan, con trato honesto. |
| **E8** | Piloto gratuito | Los familiares del piloto usan el producto completo sin pagar. |
| **E9** | Entrada y venta | Landing, onboarding y textos legales describen con honestidad lo que el producto hace. |
| **E10** | Modo simple | La persona mayor confirma sus propias tomas con un solo toque. |
| **E11** | Semana y novedades | La familia ve lo que logró, lo que cambió y se mantiene constante sin presión. |
| **E12** | Perfil y ajustes | La familia mantiene los datos del paciente, sus preferencias y el control de sus datos. |

---

## 6. Requisitos funcionales

Describen qué debe hacer el sistema, no cómo.

### E1. Acceso y cuenta
- **RF-1.** El sistema debe permitir a una persona crear una cuenta propia.
- **RF-2.** El sistema debe permitir entrar con esa cuenta y volver a los datos del círculo desde otro dispositivo.
- **RF-3.** El sistema debe impedir ver el contenido de un círculo a quien no tiene sesión iniciada.
- **RF-4.** El sistema debe pedir, al crear la cuenta, el consentimiento para los términos, la privacidad y el tratamiento de datos de salud, y registrar cuándo se dio.
- **RF-5.** El sistema debe permitir cerrar sesión, con confirmación.
- **RF-6.** El sistema debe permitir eliminar la propia cuenta y sus datos **[SUPUESTO: depende de lo que exija la revisión legal]**.

### E2. Círculo familiar
- **RF-7.** El sistema debe permitir al organizador crear el círculo de un paciente con su nombre, edad (opcional), relación, alergias, condiciones, médico y contacto de emergencia.
- **RF-8.** El sistema debe permitir invitar a otros familiares al círculo, incluida una tarjeta de invitación que se pueda guardar y compartir.
- **RF-9.** El sistema debe permitir que una persona invitada se una al círculo con su propia cuenta.
- **RF-10.** El sistema debe mostrar a todos los miembros los mismos datos del círculo: medicinas, tomas, citas y notas.
- **RF-11.** Cuando un miembro registra o cambia algo, el resto debe verlo al abrir la app o al volver a ella, sin pedirlo ni recargar a mano. No se exige que el cambio aparezca en tiempo real **[SUPUESTO]**.
- **RF-12.** El sistema debe mostrar quién es cada miembro y qué hizo cada cosa.
- **RF-13.** Todos los miembros tienen los mismos permisos sobre medicinas, tomas y citas: ver, crear, editar y eliminar, incluidas las creadas por otros. La única excepción es la bitácora: cada miembro edita o borra solo sus propias notas (RF-30). No hay roles diferenciados.

### E3. Medicinas y tomas
- **RF-14.** El sistema debe permitir dar de alta una medicina con nombre, dosis, horarios, frecuencia y notas.
- **RF-15.** El sistema debe permitir editar, pausar, reanudar y eliminar una medicina, pidiendo confirmación antes de eliminar.
- **RF-16.** El sistema debe mostrar, para el día en curso, las tomas pendientes, las dadas y las no dadas, y destacar la próxima toma y quién la da.
- **RF-17.** El sistema debe permitir confirmar una toma indicando quién la dio.
- **RF-18.** El sistema debe permitir registrar que una toma no se dio, con un motivo elegido de una lista.
- **RF-19.** El sistema debe permitir deshacer un registro de toma hecho por error.
- **RF-20.** El sistema debe impedir registrar dos veces la misma toma para la misma medicina, día y hora. Si dos miembros la confirman casi al mismo tiempo, se conserva un solo registro y al segundo se le informa quién la registró y cuándo.
- **RF-21.** El sistema debe conservar el historial de tomas de cada medicina, incluidas las no dadas, y mostrar un resumen de adherencia de la semana calculado con lo registrado.

### E4. Citas
- **RF-22.** El sistema debe permitir crear una cita con título, especialista, fecha, hora, lugar, quién acompañará y la preferencia de aviso (día antes y horas antes).
- **RF-23.** El sistema debe permitir editar, cancelar y eliminar una cita.
- **RF-24.** El sistema debe permitir marcar una cita como atendida y anotar el resultado y lo que quedó pendiente.
- **RF-25.** El sistema debe listar las citas próximas y las pasadas.
- **RF-26.** El sistema debe permitir navegar las citas por meses.

### E5. Bitácora
- **RF-27.** El sistema debe permitir escribir una nota con un tipo (síntoma, ánimo, comida y sueño, otra).
- **RF-28.** El sistema debe registrar automáticamente el autor y el momento de cada nota.
- **RF-29.** El sistema debe mostrar las notas agrupadas por día, de la más reciente a la más antigua.
- **RF-30.** El sistema debe permitir a un miembro editar o borrar sus propias notas, y no las de otros.
- **RF-31.** El sistema debe permitir filtrar la bitácora por tipo de nota y por miembro.

### E6. Hoja para la consulta
- **RF-32.** El sistema debe generar una hoja con el nombre del paciente, sus alergias (con la fecha en que la familia las registró), las medicinas con sus horarios y las dosis registradas de las últimas semanas, distinguiendo las dadas de las no confirmadas **[SUPUESTO: el periodo exacto]**. Hoy la hoja no incluye notas, condiciones ni contactos.
- **RF-33.** La hoja debe mostrarse como vista previa y poder imprimirse o guardarse como archivo. El sistema nunca la envía por sí solo.
- **RF-34.** La hoja no agrega diagnósticos, interpretaciones ni recomendaciones propias: solo muestra lo que la familia registró, con su fecha, y presenta las alergias como "registradas por la familia".
- **RF-35.** La hoja debe indicar la fecha en que se generó y aclarar que apoya la consulta y no reemplaza el criterio del médico.

### E7. Suscripción y cobro
- **RF-36.** El sistema debe ofrecer dos planes de pago: mensual y anual.
- **RF-37.** El sistema debe llevar al organizador a completar el pago con el proveedor de cobros elegido.
- **RF-38.** El sistema debe reflejar el estado de la suscripción (activa, pago pendiente, cancelada) sin que el dueño tenga que actualizarlo a mano, de modo que el usuario lo vea en su siguiente uso de la app.
- **RF-39.** El sistema debe permitir al organizador actualizar su medio de pago y cancelar la suscripción en un par de pasos, sin esconder la opción.
- **RF-40.** Antes de confirmar una cancelación, el sistema debe hacer una sola pregunta sobre el motivo y responder con una ayuda honesta, nunca con culpa. La pregunta no debe impedir ni demorar la cancelación.
- **RF-41.** Ante un pago pendiente o una cancelación, el sistema debe mostrar el estado actual, hasta cuándo conserva acceso el usuario y qué hacer para continuar, sin plazos que presionen ni frases de culpa.
- **RF-42.** El sistema no debe mostrar el contenido del círculo a una cuenta sin suscripción vigente ni acceso de piloto **[SUPUESTO: la política exacta de acceso tras cancelar está por definir]**.
- **RF-43.** La pantalla de suscripción debe mostrar el valor que el círculo ya recibió (por ejemplo, tomas registradas y familiares activos) como motivo real para seguir.
- **RF-44.** El sistema debe sugerir el plan anual solo a quien ya vio valor, no a quien recién empieza.
- **RF-45.** Cuando el motivo de cancelación sea el precio, el sistema puede ofrecer un cupón de regreso, solo si el dueño configuró uno **[SUPUESTO: depende de la oferta definida]**.

### E8. Piloto gratuito
- **RF-46.** El sistema debe permitir dar acceso completo sin pago a familiares del piloto.
- **RF-47.** El acceso de piloto debe poder retirarse.
- **RF-48.** Las cuentas de piloto deben poder distinguirse de las de pago para medir el uso por separado.

### E9. Entrada y venta
- **RF-49.** La landing debe describir solo lo que el producto hace en el MVP: no debe prometer avisos, correos ni funciones fuera de alcance. Criterio de aceptación: cada afirmación de la landing corresponde a un requisito de este documento.
- **RF-50.** El onboarding debe llevar al organizador a crear su círculo y registrar la primera medicina.
- **RF-51.** El sistema debe publicar términos, privacidad, reembolsos, cookies y aviso médico, coherentes con la oferta real (precio, prueba, garantía).
- **RF-52.** Los textos legales deben quedar revisados por un abogado del país elegido antes de cobrar a personas reales.
- **RF-53.** Antes de abrir la venta no debe quedar ninguna función sin conectar. Mientras dure la demostración o las pruebas internas, lo que no esté conectado debe decirlo en pantalla en lugar de simular que funciona. Esto aplica en particular a los avisos de citas: o se envían de verdad, o la preferencia de aviso no se ofrece antes de la venta **[DECISIÓN ABIERTA]**.

### E10. Modo simple
- **RF-54.** El sistema debe ofrecer una vista simple para la persona mayor que muestre la próxima toma con texto muy grande y alto contraste, y una sola acción principal: "Ya la tomé".
- **RF-55.** Al confirmar, la toma debe quedar registrada como confirmada por la propia persona y todos los miembros del círculo deben verla.
- **RF-56.** La vista simple no debe mostrar menús ni secciones adicionales.
- **RF-57.** Cuando no haya tomas pendientes, la vista simple debe decirlo con claridad.
- **RF-58.** Un miembro debe poder activar el modo simple desde los ajustes y abrir esa vista en el dispositivo de la persona mayor **[SUPUESTO: cómo accede la persona mayor sin crear una cuenta propia está por definir]**.

### E11. Semana y novedades
- **RF-59.** El sistema debe mostrar la semana del círculo: lo que la familia logró en siete días, quién ayudó y qué viene, calculado solo con lo registrado. No envía nada.
- **RF-60.** Al abrir Hoy, el sistema debe mostrar lo que pasó desde la última visita de esa persona, si hubo novedades.
- **RF-61.** El sistema debe llevar una racha del círculo que cuente los días con registro completo (toma dada, o no dada con su motivo). Decir la verdad también suma. Un día incompleto no rompe la racha si hay un comodín disponible.
- **RF-62.** El sistema debe celebrar cada hito del círculo una sola vez.
- **RF-63.** El sistema debe guiar a quien empieza con los primeros pasos (por ejemplo, registrar la primera medicina e invitar a un familiar).
- **RF-64.** Ante un pago pendiente, el sistema debe mostrar un aviso visible, calmado y sin culpa.

### E12. Perfil y ajustes
- **RF-65.** El sistema debe permitir ver y editar el perfil del paciente: nombre, edad, relación, alergias, condiciones, médico y contacto de emergencia.
- **RF-66.** El sistema debe permitir definir las preferencias de aviso por defecto para las citas nuevas.
- **RF-67.** El sistema debe permitir exportar los datos del círculo a un archivo.
- **RF-68.** El sistema debe permitir borrar los datos guardados en el dispositivo, con confirmación.

---

## 7. Requisitos no funcionales

- **RNF-1. Privacidad de datos de salud.** Los datos de medicinas, citas, notas y nombres no deben aparecer en registros de errores, analítica ni enlaces que se puedan compartir.
- **RNF-2. Acceso restringido.** Solo los miembros de un círculo pueden ver su contenido. Un usuario nunca debe ver datos de otra familia.
- **RNF-3. Consentimiento.** Los permisos de datos de salud, medición y marketing se piden por separado, se registran y se pueden retirar.
- **RNF-4. Honestidad.** Ningún texto en pantalla promete algo que el producto no hace en ese momento.
- **RNF-5. Accesibilidad.** Texto de cuerpo de 16 px o más; botones principales de 56 px de alto en móvil; objetivos táctiles de 44 px o más; foco visible; respeto de la preferencia de movimiento reducido. La vista simple usa texto aún mayor y alto contraste.
- **RNF-6. Uso en móvil.** Todo el flujo principal (registrar una toma, anotar una nota, consultar una cita) debe poder hacerse con una mano en un teléfono.
- **RNF-7. Idioma y tono.** Español neutro, con tuteo y ortografía correcta. Sin culpa para retener o cobrar. Sin lenguaje clínico que parezca diagnóstico. Las piezas de retención son calmadas y agradecidas: nunca reproches por no usar la app.
- **RNF-8. Fiabilidad del registro.** Una toma registrada no debe perderse ni duplicarse. Si no se pudo guardar, el usuario debe enterarse.
- **RNF-9. Continuidad.** El usuario debe poder retomar donde estaba sin perder lo que escribió por un fallo de conexión **[SUPUESTO: nivel exacto por definir en el diseño]**.
- **RNF-10. Identidad visual.** Se respeta la identidad visual existente (colores, tipografías y el Círculo).
- **RNF-11. Salud.** El producto no diagnostica, no receta y no sustituye al médico.
- **RNF-12. Registro veraz.** El diseño no debe empujar a confirmar una toma que no se dio: anotar que no se dio, con su motivo, es una respuesta válida y cuenta igual para la constancia.

---

## 8. Restricciones

### 8.1 Punto de partida
- El producto parte de una plantilla de aplicación web ya existente, con landing, onboarding, páginas legales y una demostración de la app. Se mantiene esa base y su identidad visual.
- Hoy los datos se guardan solo en el navegador de cada persona. No hay cuentas, cobros ni correos reales conectados.
- Para vender se exigen dos servicios externos: uno de cuentas y datos compartidos, y otro de cobros. Un servicio de correos es opcional y queda fuera del MVP.
- La plantilla exige una verificación automática sin pendientes antes de publicar. Esa verificación no se modifica para que pase.

### 8.2 Restricciones de proceso
- Los datos propios del dueño (nombre de marca, correo de soporte, precios, datos legales) los aporta él; no se inventan ni se toman de otro producto.
- Las claves y credenciales las gestiona solo el dueño. Nunca aparecen en el código, en el repositorio ni en conversaciones.
- Los cambios sobre lo ya publicado se hacen como cambios nuevos, sin reescribir lo anterior.
- Antes de cualquier paso que cree cuentas, cobre, envíe correos o publique, se pide confirmación expresa al dueño.

### 8.3 Restricciones de negocio y legales
- Los textos legales son borradores y deben revisarse con un abogado del país elegido.
- No se citan leyes ni autoridades sin esa revisión.
- La validación es doble y simultánea: venta abierta y piloto con familiares.

---

## 9. Métricas de éxito

Las metas numéricas son **[SUPUESTO]** de partida. Se ajustan con el dueño antes del lanzamiento. Cada métrica se mide por familia (círculo).

### 9.1 Pregunta que el MVP debe responder
¿Las familias usan juntas el registro compartido durante semanas, y alguna paga por ello?

### 9.2 Métricas

| # | Métrica | Definición | Meta de partida |
|---|---|---|---|
| M1 | **Círculos con dos o más personas activas** | Porcentaje de círculos en los que al menos dos miembros distintos registraron algo en una misma semana. | [SUPUESTO] al menos la mitad de los círculos del piloto, en la semana 4. |
| M2 | **Registro de tomas** | Porcentaje de las tomas programadas, de medicinas vigentes y con horario ya vencido, que quedan con un registro (dada, confirmada por la propia persona, o no dada con motivo). Mide lo que se registra, no si el paciente la tomó. | [SUPUESTO] al menos 70 % en la semana 4. |
| M3 | **Uso sostenido** | Círculos con registros en al menos 3 de las 4 semanas del piloto. | [SUPUESTO] al menos la mitad de los círculos activados. |
| M4 | **Hoja para la consulta usada** | Círculos que generan la hoja al menos una vez antes de una cita. | [SUPUESTO] al menos un tercio de los círculos con alguna cita registrada. |
| M5 | **Activación** | Porcentaje de organizadores que, tras crear la cuenta, registran una medicina y un segundo familiar acepta la invitación y entra a su cuenta. | [SUPUESTO] al menos 60 % en las primeras 48 horas. |
| M6 | **Disposición a pagar** | Familias que completan el pago, sobre las familias a las que se les ofreció el plan (conteo llevado por el dueño). | [SUPUESTO] al menos una por cada diez familias ofrecidas; el número exacto lo fija el dueño. |
| M7 | **Cancelación** | Familias que cancelan o no renuevan en su primer ciclo de cobro. Si ese ciclo cae fuera de las 4 semanas, se mide en un seguimiento posterior. | Se mide sin meta: es la señal más honesta de valor. |
| M8 | **Motivo de abandono** | Razón dada por las familias que dejan de usar la app (entrevista corta). | Cualitativa: al menos 5 entrevistas al cierre del piloto. |
| M9 | **Uso del modo simple** | Círculos donde la propia persona mayor confirmó al menos una toma desde la vista simple. | [SUPUESTO] al menos un tercio de los círculos que la activan. Es la señal de si el registro del paciente funciona. |

### 9.2 bis. Cómo se mide sin romper la privacidad
Las métricas se calculan con conteos de actividad (cuántas tomas, notas y citas, y quién las registró), nunca con el contenido. Las familias que no consientan la medición (RNF-3) se excluyen del cálculo, y se informa cuántas son para saber qué parte del piloto representan las cifras.

### 9.3 Criterio de decisión (al cierre de 4 semanas del piloto)
- **Va:** M1 y M2 alcanzan o superan su meta, y al menos una familia ha pagado.
- **Ajustar:** M2 alcanza la meta pero M1 no. El registro funciona, pero la familia no lo comparte. El problema está en la invitación o en el valor para el segundo cuidador.
- **No va:** solo anota quien organiza, el resto no entra y no hay pagos. La familia vuelve al chat.

### 9.4 Cómo se verifica que el producto cumple, antes de medir
- Dos personas distintas, cada una con su cuenta y en su propio teléfono, pueden ver lo que la otra registra (RF-10, RF-11).
- Una toma no se puede registrar dos veces (RF-20).
- Una toma confirmada desde la vista simple la ven todos los miembros (RF-55).
- Una cuenta sin suscripción ni acceso de piloto no ve el contenido del círculo (RF-42).
- Ningún texto de la landing ni de la app promete algo fuera de alcance (RF-49, RF-53, RNF-4).
- El recorrido completo (crear círculo, invitar, registrar medicina, confirmar toma, anotar nota, registrar cita, generar hoja) se completa de punta a punta, sin pasos manuales ni datos de ejemplo.

---

## 10. Decisiones abiertas y riesgos

### Decisiones abiertas
- Primer país y, con él, idioma y medios de pago del lanzamiento.
- Precio de los planes mensual y anual, duración de la prueba y política de reembolso. Los valores de la plantilla son sugeridos y no están confirmados.
- Política de acceso tras cancelar o con pago pendiente.
- Cuándo se considera listo el "compartido entre familiares" para abrir la venta.
- Valores definitivos de las metas de la sección 9, tamaño mínimo del piloto y criterio de "no va" para el pago.
- **Avisos de citas:** hoy la app guarda la preferencia pero no envía nada. Hay que decidir si se desarrolla el envío antes de vender o si se oculta la preferencia hasta entonces (RF-53).
- **Cómo accede la persona mayor al modo simple** cuando hay cuentas reales (RF-58).
- **Contenido de la hoja para la consulta:** hoy no incluye notas, condiciones ni preguntas para el médico, aunque el problema de relevo las nombra. Decidir si se agregan o si la hoja se mantiene mínima por privacidad.
- Qué hacer con los datos de quien elimina su cuenta o con el círculo cuando se queda sin miembros.
- Si el cupón de regreso se ofrece desde el lanzamiento o queda apagado.

### Riesgos aceptados al ampliar el alcance
- **Más superficie que probar.** Entran doce épicas en lugar de nueve. Cada pantalla adicional (semana, racha, hitos, plan anual, cupón) agrega casos de prueba y textos que deben ser veraces. Los tres elementos que bloquean la venta siguen siendo cuentas, círculo compartido y cobro.
- **Más promesas posibles en la landing.** Con más módulos, RF-49 pasa a ser más exigente: la landing actual describe un producto ya conectado.
- **El registro del paciente depende de que use la vista simple.** Si la persona mayor no la usa, la parte del problema "toma sin testigos" sigue sin cubrirse. M9 es la señal.
- **La constancia puede incentivar el registro falso.** La racha cuenta también las tomas no dadas con motivo (RF-61, RNF-12) para evitar que alguien confirme lo que no ocurrió.
- **Un solo plan ya no es un experimento limpio.** Con dos planes, cupón y sugerencia del anual, se aprende menos sobre el precio base con pocas familias.
