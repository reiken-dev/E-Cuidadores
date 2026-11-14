#!/usr/bin/env node
// VERIFICADOR DE LA PLANTILLA — dice qué falta antes de vender.
// Uso:  npm run verificar            (informa)
//       npm run verificar -- --estricto   (sale con error si queda algo pendiente: úsalo antes de publicar)
// No se conecta a ningún servicio: solo lee tus archivos.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = process.cwd();
const ESTRICTO = process.argv.includes('--estricto');
const resultados = [];
const ok = (t) => resultados.push(['✅', t]);
const aviso = (t, detalle) => resultados.push(['⚠️ ', t, detalle]);
const falla = (t, detalle) => resultados.push(['❌', t, detalle]);

function archivos(dir, exts, salida = []) {
  for (const n of readdirSync(dir)) {
    if (['node_modules', '.next', '.git', 'docs', 'tests'].includes(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) archivos(p, exts, salida);
    else if (exts.some((e) => n.endsWith(e)) && !n.includes('.test.')) salida.push(p);
  }
  return salida;
}
const fuentes = ['app', 'components', 'lib'].flatMap((d) => (existsSync(join(RAIZ, d)) ? archivos(join(RAIZ, d), ['.ts', '.tsx']) : []));
const leer = (p) => readFileSync(p, 'utf8');
function buscar(regex) {
  const hallazgos = [];
  for (const f of fuentes) {
    leer(f).split('\n').forEach((l, i) => {
      if (regex.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*')) hallazgos.push(`${relative(RAIZ, f)}:${i + 1}`);
    });
  }
  return hallazgos;
}

// 1. Textos de plantilla visibles para el cliente final
const marcadores = [
  [/El comprador|comprador conecta|comprador define|quien publique esta plantilla/i, 'Textos que hablan de "el comprador" (son notas para ti, no para tus clientes)'],
  [/Esta plantilla no procesa pagos|Esta es una demostración local|Vista local|Ejemplo: aquí no se cobra|Ejemplo: se activa/i, 'Avisos de plantilla sobre pagos o acceso simulado'],
  [/cuando conectes|al conectar tu servidor|al conectar las cuentas/i, 'Avisos de "cuando conectes…" que verá el cliente final'],
  [/soporte@entrehermanos\.app/, 'Correo de soporte de ejemplo (cámbialo en lib/marca.ts)'],
];
for (const [re, desc] of marcadores) {
  const h = buscar(re);
  if (h.length) aviso(desc, `${h.length} lugar(es): ${h.slice(0, 4).join(', ')}${h.length > 4 ? '…' : ''}`);
  else ok(`Sin: ${desc}`);
}

// 1b. Datos sin rellenar: [COMPLETAR: …] bloquea la publicación; [VERIFICAR: …] pide revisar a mano
// Documentos que el alumno copia o sigue al publicar: sus marcadores también bloquean la publicación.
const docsRetencion = ['docs/retencion', 'docs/conexion'].flatMap((d) =>
  existsSync(join(RAIZ, d)) ? readdirSync(join(RAIZ, d)).filter((n) => /\.(md|txt)$/.test(n)).map((n) => join(RAIZ, d, n)) : []
);
const completar = [];
const verificar = [];
for (const f of [...fuentes, ...docsRetencion]) leer(f).split('\n').forEach((l, i) => {
  if (/\[COMPLETAR:/.test(l)) completar.push(`${relative(RAIZ, f)}:${i + 1}`);
  if (/\[VERIFICAR:/.test(l)) verificar.push(`${relative(RAIZ, f)}:${i + 1}`);
});
if (completar.length) falla('Quedan datos por completar ([COMPLETAR: …])', `${completar.length} lugar(es): ${completar.slice(0, 4).join(', ')}${completar.length > 4 ? '…' : ''}`);
else ok('Sin datos por completar');
if (verificar.length) falla('Hay afirmaciones marcadas para verificar ([VERIFICAR: …]): confírmalas y bórralas', `${verificar.length} lugar(es): ${verificar.slice(0, 4).join(', ')}${verificar.length > 4 ? '…' : ''}`);
else ok('Sin afirmaciones pendientes de verificar');

// 2. Marca
const marca = leer(join(RAIZ, 'lib/marca.ts'));
// Conexiones reales (lib/marca.ts → conexiones: { supabase, hotmart, resend }). Se leen del propio archivo.
const bloqueConexion = (marca.match(/conexiones:\s*\{([^}]*)\}/) || [])[1];
const conexion = { supabase: false, hotmart: false, resend: false };
for (const k of Object.keys(conexion)) conexion[k] = new RegExp(`${k}:\\s*true`).test(bloqueConexion || '');
if (/nombre: 'Entre Hermanos'/.test(marca)) aviso('El nombre de la marca sigue siendo "Entre Hermanos"', 'Edita lib/marca.ts y los textos de app/page.tsx');
else ok('Marca personalizada');

// 3. Variables de entorno
const envLocal = existsSync(join(RAIZ, '.env.local')) ? leer(join(RAIZ, '.env.local')) : '';
const env = (k) => (process.env[k] || (envLocal.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1] || '').trim();
if (!envLocal) aviso('No existe .env.local', 'Copia .env.example como .env.local y completa los valores');
for (const [k, para, con] of [
  ['NEXT_PUBLIC_SITE_URL', 'tu dominio (no localhost)', null],
  ['NEXT_PUBLIC_SUPABASE_URL', 'Supabase', 'supabase'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase', 'supabase'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Supabase (solo servidor)', 'supabase'],
  ['NEXT_PUBLIC_HOTMART_CHECKOUT_URL', 'Hotmart', 'hotmart'],
  ['HOTMART_HOTTOK', 'Hotmart (webhook)', 'hotmart'],
  ['RESEND_API_KEY', 'Resend (correo)', 'resend'],
  ['NEXT_PUBLIC_HOTMART_PANEL_URL', 'Hotmart: panel de compras (pagar o cancelar) — pantalla Tu suscripción', 'hotmart'],
  ['NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL', 'Hotmart: plan anual — sugerencia del anual', 'hotmart'],
]) {
  const v = env(k);
  if (!v && con && conexion[con]) falla(`Falta ${k}: la conexión ${con} está marcada en lib/marca.ts`, para);
  else if (!v) aviso(`Falta ${k}`, para);
  else if (k === 'NEXT_PUBLIC_SITE_URL' && /localhost/.test(v)) aviso('NEXT_PUBLIC_SITE_URL apunta a localhost', 'Pon tu dominio real antes de publicar');
  else ok(`${k} definida`);
}

// 4. Qué sigue simulado
const store = leer(join(RAIZ, 'lib/store.ts'));
if (/localStorage/.test(store)) aviso('Datos: siguen guardados en el navegador (lib/store.ts)', 'Conéctalos a Supabase: ver MANUAL-DEL-DUENO.md sección 6');
else ok('Datos conectados a un servidor');
if (!existsSync(join(RAIZ, 'app/api'))) aviso('No hay rutas de servidor (app/api)', 'Faltan webhook de Hotmart y correos con Resend');
else ok('Existen rutas de servidor');
if (/function\s+enviar[\s\S]*console\.debug/.test(leer(join(RAIZ, 'lib/analytics.ts')))) aviso('Medición sin proveedor (lib/analytics.ts)', 'Conecta Plausible, PostHog o GA4 dentro de enviar()');
else ok('Medición conectada');
const guardApp = existsSync(join(RAIZ, 'app/app/layout.tsx')) && /sesionDelServidor/.test(leer(join(RAIZ, 'app/app/layout.tsx')));
if (!guardApp && !existsSync(join(RAIZ, 'middleware.ts')) && !existsSync(join(RAIZ, 'proxy.ts'))) aviso('/app no está protegido por sesión', 'Agrega la protección de rutas al conectar la autenticación (lib/sesion.ts)');
else ok('Protección de /app presente (guard en app/app/layout.tsx; la sesión real se completa en lib/sesion.ts)');

// 5. Seguridad básica
const gi = leer(join(RAIZ, '.gitignore'));
if (!/\.env/.test(gi)) falla('.gitignore no ignora los .env', 'Agrega .env* para no subir secretos a GitHub');
else ok('.env ignorado por git');
const secretos = [];
for (const f of fuentes) if (/(service_role['"]?\s*[:=]\s*['"]ey|sk_live_|re_[A-Za-z0-9]{20,}|HOTTOK\s*=\s*['"][^'"]+)/.test(leer(f))) secretos.push(relative(RAIZ, f));
if (secretos.length) falla('Posibles secretos escritos en el código', secretos.join(', '));
else ok('Sin secretos en el código');

// 6. Datos legales: quién es el responsable y desde qué país opera
const legal = leer(join(RAIZ, 'lib/legal.ts'));
if (/responsable: null/.test(legal)) aviso('Falta el nombre o razón social del responsable', 'Edita LEGAL.responsable en lib/legal.ts');
else ok('Responsable legal definido');
if (/pais: null/.test(legal)) aviso('Falta el país desde el que operas (ley aplicable)', 'Edita LEGAL.pais en lib/legal.ts');
else ok('País definido');
if (/emailLegal: null/.test(legal) && /soporte@entrehermanos\.app|\[COMPLETAR/.test(leer(join(RAIZ, 'lib/marca.ts')))) aviso('El correo legal es el de ejemplo o falta', 'Cambia soporteEmail en lib/marca.ts (o LEGAL.emailLegal)');
else ok('Correo legal real');
ok('Coherencia de garantía, prueba y conservación entre landing, paywall y documentos: la vigilan las pruebas (npm test)');

const oferta = leer(join(RAIZ, 'lib/oferta.ts'));
if (/PRECIOS_DE_EJEMPLO = true/.test(oferta)) falla('Los precios de lib/oferta.ts son de ejemplo', 'Pon tus precios reales y PRECIOS_DE_EJEMPLO = false (PARA-LA-IA-DEL-ALUMNO.md §2)');
else ok('Precios confirmados por el dueño');
// 7. Retención: lo que depende de tu servidor
if (/DATOS_CONSERVACION_CONFIRMADA = false/.test(oferta)) aviso('La conservación de datos por días aún no está confirmada: los textos no dan plazo', 'Cuando tu servidor borre a los ' + (oferta.match(/DIAS_CONSERVAR_DATOS = (\d+)/) || [])[1] + ' días, pon DATOS_CONSERVACION_CONFIRMADA = true en lib/oferta.ts: entonces los textos darán el plazo');
else ok('Conservación de datos confirmada por el dueño');
if (/SINCRONIZACION_CONECTADA = false/.test(oferta)) aviso('Los textos no prometen que "todos lo ven" (sincronización sin conectar)', 'Cuando Supabase sincronice entre dispositivos, pon SINCRONIZACION_CONECTADA = true en lib/oferta.ts');
else ok('Sincronización entre hermanos confirmada');
if (/COMPROMISOS_LEGALES_CUMPLIDOS = false/.test(legal)) aviso('Baja de correos, aviso de renovación anual y cierre de cuenta aún no están implementados: los textos no los prometen', 'Impleméntalos y pon COMPROMISOS_LEGALES_CUMPLIDOS = true en lib/legal.ts (PARA-LA-IA-DEL-ALUMNO.md §7): entonces los textos los prometen');
else ok('Compromisos legales cumplidos');
if (/CORREOS_CONECTADOS = false/.test(oferta)) aviso('Las pantallas no dicen "te enviamos…" (correos sin conectar)', 'Al conectar Resend, pon CORREOS_CONECTADOS = true en lib/oferta.ts');
else ok('Correos conectados');
if (!existsSync(join(RAIZ, 'app/api/hotmart'))) aviso('El webhook de Hotmart no está activo', 'Copia docs/conexion/hotmart-webhook.ts.txt a app/api/hotmart/route.ts al conectar (LISTA-DE-CONEXION.md)');
else ok('Webhook de Hotmart presente');

// 8. Gate de conexión: vender exige Supabase (datos, cuentas y sesión) y Hotmart (cobros) conectados.
if (!bloqueConexion) falla('Falta el bloque conexiones en lib/marca.ts', 'Añade: conexiones: { supabase: false, hotmart: false, resend: false }');
else {
  for (const [k, nombre] of [
    ['supabase', 'Supabase (datos, cuentas y sesión)'],
    ['hotmart', 'Hotmart (cobros y estado de la suscripción)'],
  ]) {
    if (conexion[k]) ok(`Conexión ${nombre}: marcada como conectada`);
    else falla(`Sin conectar: ${nombre}`, `Conéctala (LISTA-DE-CONEXION.md) y pon ${k}: true en lib/marca.ts solo cuando funcione de punta a punta`);
  }
  if (conexion.resend) ok('Resend: marcado como conectado');
  else aviso('Resend sin conectar: no se envían correos', 'Si lo usas, conéctalo y pon resend: true en lib/marca.ts; si no, déjalo en false y dilo en la guía');
}

if (!resultados.every((r) => r[0] === '✅')) console.log('\nSi usas una IA para conectar: dile que lea PARA-LA-IA-DEL-ALUMNO.md primero.');
// Informe
console.log('\nVERIFICACIÓN DE LA PLANTILLA\n');
for (const [i, t, d] of resultados) console.log(`${i} ${t}${d ? `\n     → ${d}` : ''}`);
const pendientes = resultados.filter((r) => r[0] !== '✅').length;
const fallas = resultados.filter((r) => r[0] === '❌').length;
console.log(`\n${resultados.length - pendientes} de ${resultados.length} listos · ${pendientes} pendientes${fallas ? ` (${fallas} graves)` : ''}\n`);
if (fallas || (ESTRICTO && pendientes)) process.exit(1);
