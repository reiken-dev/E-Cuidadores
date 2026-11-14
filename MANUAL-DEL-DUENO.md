# Manual del dueño: E-Cuidadores

Este manual es para ti, que compraste la plantilla. No necesitas saber programar. Necesitas ganas de aprender y, para los pasos técnicos, la ayuda de una inteligencia artificial (por ejemplo Claude). Cuando un paso diga "pídele a tu IA", copia la frase entre comillas y pégala en el chat junto con el archivo que se menciona.

Cada palabra técnica se explica la primera vez que aparece.

---

## 1. Qué es esta plantilla y qué incluye

Es una aplicación web lista para vender. Ayuda a hermanos adultos a cuidar juntos a su papá, mamá u otro familiar mayor. Trae:

- **Página de ventas**: la primera página que ve quien llega por tu publicidad.
- **Recorrido de bienvenida**: unas preguntas cortas y la pantalla de planes (mensual y anual, con 7 días de prueba gratis).
- **Acceso**: crear cuenta y entrar con correo y contraseña.
- **La app**: Hoy (próxima dosis), Medicinas, Citas, Bitácora de novedades, Familia, Resumen para el médico y Modo simple para el adulto mayor.
- **Textos legales**: Privacidad, Términos y Reembolsos, ya redactados como borrador.
- **Pruebas automáticas**: comprueban que la lógica de medicinas, citas y resumen funciona.

**Lo más importante que debes saber:** hoy la plantilla funciona sola, en tu computador, con datos de ejemplo. Nada se guarda en un servidor, nadie paga de verdad y ningún correo se envía. Todo eso lo tienes que conectar tú (sección 6). Hasta entonces, no la publiques para vender.

---

## 1.1 Para quién es y cuándo se siente el valor

**Cliente ideal:** hermanos adultos que se reparten el cuidado de su papá, su mamá u otro familiar mayor, y que se olvidan de medicinas y citas porque la información vive repartida entre chats y memorias.

**Momento "ajá":** abrir Hoy y ver de un vistazo qué medicina y qué cita toca hoy para su familiar, con su nombre y su hora.

**Compromiso antes del paywall:** cargar la primera medicina real. Antes de guardarla, la persona autoriza expresamente el tratamiento de datos de salud.

**Pantallas del onboarding y su propósito:**

| Pantalla | Para qué está | Qué se usa después |
|---|---|---|
| 1. ¿A quién vas a cuidar? | Promesa en lenguaje de la familia: que nadie más pregunte «¿ya le diste la pastilla?». | Parentesco del familiar. |
| 2. Pongamos los nombres | Que el plan se lea como suyo. | Nombre del familiar y de quien organiza. |
| 3. ¿Cuántos hermanos te ayudan? | Saber cuántas personas comparten el círculo (entran gratis). | Personas del círculo. |
| 4. ¿Qué te preocupa más hoy? | Elegir qué va primero. | Orden de la muestra y del paywall. |
| Reconocimiento | Decir que la causa es el sistema, no la persona. | Solo acompaña. |
| 5. ¿Qué medicamento toma ahora? | Compromiso: la primera medicina real, con autorización de datos de salud. | Primera medicina del plan. |
| Así se verá hoy | Mostrar el "ajá" con sus propios datos. Lo que aún no existe se dice así, nunca se inventa. | Solo muestra. |
| Antes de empezar | Responder las dudas más comunes: seguridad, tiempo y garantía. | Solo informa. |
| Paywall (planes) | Oferta con la prueba y la garantía con su texto real. | Activación del plan. |

Las métricas del programa salen de los eventos de `lib/analytics.ts` (`onboarding_paso`, `onboarding_omitido`, `paywall_visto`, `paywall_cta`, `prueba_iniciada`). Sin proveedor conectado no se envía nada.

---

## 2. Cómo abrirla en tu computador

1. Instala **Node.js** desde <https://nodejs.org> (elige la versión "LTS"). Node es el programa que hace funcionar la aplicación en tu computador.
2. Abre la carpeta del proyecto en una **terminal** (una ventana donde se escriben comandos). En Windows puedes abrir la carpeta, escribir `cmd` en la barra de direcciones y pulsar Enter.
3. Escribe estos dos comandos, uno a la vez, y pulsa Enter después de cada uno:

```bash
npm install
npm run dev
```

`npm install` descarga las piezas que la aplicación necesita (tarda unos minutos, solo se hace una vez). `npm run dev` la enciende.

4. Abre <http://localhost:3000> en tu navegador. Verás la página de ventas.
5. Para apagarla, vuelve a la terminal y pulsa `Ctrl + C`.

**Qué esperar:** la app abre con datos de ejemplo de una señora llamada Rosa y tres hermanos. Lo que agregues se guarda solo en ese navegador. En Familia hay un botón "Restablecer datos de ejemplo" para volver al inicio.

Para ver la app directamente entra a <http://localhost:3000/app>.

---

## 3. Mapa de carpetas

| Carpeta o archivo | Qué hay ahí |
|---|---|
| `app/page.tsx` | La página de ventas |
| `app/onboarding/` | Preguntas de bienvenida y pantalla de planes |
| `app/entrar/` | Crear cuenta y entrar (simulado) |
| `app/app/` | Las pantallas de la app interna |
| `app/privacidad`, `app/terminos`, `app/reembolsos` | Los textos legales |
| `app/layout.tsx` | Nombre del sitio, descripción y tipografías |
| `components/landing/` | Piezas de la página de ventas. Aquí está `tokens.css` (colores y formas) |
| `components/onboarding/` | Piezas del recorrido de bienvenida y de la pantalla de planes |
| `components/app/` | Piezas de la app interna |
| `lib/store.ts` | **Donde se guardan los datos hoy** (en el navegador). Lo vas a reemplazar |
| `lib/seed.ts` | Los datos de ejemplo (Rosa, medicinas, citas, notas) |
| `lib/schedule.ts`, `lib/summary.ts`, `lib/dates.ts` | La lógica: qué dosis tocan, adherencia, resumen y fechas |
| `lib/*.test.ts` | Las pruebas automáticas |
| `public/` | Imágenes |
| `next.config.ts` | Configuración y cabeceras de seguridad |
| `.env.example` | Lista de las claves que necesitarás (sin valores) |

---

## 4. Cambiar nombre, colores y tipografías

### El nombre

Busca "E-Cuidadores" en todo el proyecto y cámbialo. Pídele a tu IA: "Cambia el nombre de la marca de E-Cuidadores a MI NOMBRE en todo el proyecto, incluidos los textos legales, y muéstrame la lista de archivos que tocaste". Cambia también el correo de soporte: está en `lib/marca.ts` (`soporteEmail`) y hoy dice `correo@correo.com`, que es solo un ejemplo. **Debes cambiarlo** por un correo tuyo que vayas a usar de verdad: aparece en el pie, en los textos legales y en los avisos. El gate no lo bloquea, pero tus clientes lo verán.

### Los colores y las formas

Todo el color vive en **un solo archivo**: `components/landing/tokens.css`. Cada línea es un "token": un nombre que guarda un color. Cambias el valor y todo el sitio cambia.

| Token | Para qué sirve |
|---|---|
| `--bg` | Fondo de todas las pantallas |
| `--surface` | Fondo de las tarjetas |
| `--text-primary` y `--text-secondary` | Texto principal y texto de apoyo |
| `--accent` | Color de los botones y del dato importante |
| `--radius-card`, `--radius-button` | Qué tan redondeadas son las tarjetas y los botones |
| `--grad-brand`, `--grad-soft` | Degradados de la marca (botones de marca, "después", bloques de confianza) |
| `--navy`, `--navy-2` | Bloques oscuros (cierre de la landing, pacto) |
| `--sun` | La nota cálida y humana, en puntos mínimos |

La paleta vigente es **"Azul Confianza"** (ver `components/landing/tokens.css`). Si cambias el azul, cambia a la vez `--accent`, `--accent-warm`, `--grad-brand`, el `rgb(31 91 214)` de las sombras y los colores del archivo `components/brand/Circulo.tsx` y de `app/icon.svg`.

### La identidad: el Círculo, el grano y el sello

- **El Círculo** (`components/brand/Circulo.tsx`): cinco personas alrededor de un centro. Sale en la landing, en los estados vacíos, en el recorrido de bienvenida y en las páginas de error. Cambia las letras y colores de `NODOS` por los de tu marca.
- **El grano** (clase `.grano` en `app/globals.css`): una textura sutil sobre fondos grandes.
- **El sello de nombre**: en Hoy, cada dosis confirmada muestra la persona que la dio con una marca de confirmado.
- **La oferta** (prueba, garantía y precios) se edita en `lib/oferta.ts`.

### Rendimiento de la landing

La página de ventas se dibuja en el servidor y casi no carga JavaScript: los íconos son componentes de servidor (`components/landing/icons.tsx`), el FAQ es nativo (`<details>`), la entrada de las secciones usa CSS (`components/landing/reveal.tsx`) y los enlaces son `<a>` simples. El teléfono del inicio (`components/landing/HeroPhone.tsx`) es HTML real, no una imagen. Mantén esa disciplina: cada librería o `use client` que agregues a la landing la hace más lenta en el celular.

Los colores de estado (verde de "hecho", ámbar de "atrasada", rojo suave de "error") están en `app/app/tokens-app.css`.

Regla para no estropear nada: el texto claro sobre un botón de color debe poder leerse bien. Antes de elegir un color de botón, pruébalo en <https://webaim.org/resources/contrastchecker/> y busca una relación de contraste de 4.5 o más.

### Las tipografías

Están en `app/layout.tsx` (busca `Baloo_2` e `Inter`). Puedes cambiarlas por otras de Google Fonts. Pídele a tu IA: "Cambia la fuente de títulos a X y la de texto a Y en app/layout.tsx". Usa como máximo dos.

---

## 5. Reemplazar los datos de ejemplo y los textos

- **Datos de ejemplo de la app** (Rosa, sus medicinas, citas y notas): están en `lib/seed.ts`. Edita nombres, medicinas y notas. Las fechas son relativas a "hoy", así que siempre se ven al día.
- **Cuando conectes tu servidor** (sección 6) los datos de ejemplo dejan de usarse para los clientes reales. Déjalos solo para una cuenta de demostración.
- **Textos de la página de ventas**: en `app/page.tsx` y en `components/landing/`. Cambia frases, precios y preguntas frecuentes.
- **Precios**: la plantilla muestra US$7.99 al mes y US$79.90 al año. **Precios sugeridos: confirma tu oferta en Hotmart antes de vender.** Cámbialos aquí y en Hotmart para que coincidan. La prueba de 7 días (`TRIAL_DIAS`) también viene sugerida: confírmala en Hotmart con estos días, cambia el número o quita la prueba (0) hasta que la tengas configurada. La garantía es de 7 días, la que da Hotmart (cambia `GARANTIA_DIAS` en `lib/oferta.ts` y todo el sitio se actualiza). Si cambias un precio, cámbialo en la página de ventas, en la pantalla de planes (`components/onboarding/PaywallScreen.tsx`), en Hotmart y en los textos legales. Deben coincidir en todos lados.
- **Textos legales**: ver la sección 9.

---

## 6. Qué está simulado y qué debes conectar

| Pieza | Qué hace hoy (simulado) | Qué debes conectar | Dónde tocar |
|---|---|---|---|
| **Acceso y cuentas** | Crear cuenta y entrar solo cambian de pantalla. No se guarda ninguna contraseña. | Un servicio de autenticación real (por ejemplo Supabase Auth): guarda la contraseña **con hash** en el servidor (cifrada de forma que nadie pueda leerla), limita los intentos fallidos, confirma el correo y mantiene la sesión. | `app/entrar/EntrarForm.tsx` |
| **Datos** | Todo se guarda en el navegador de quien usa la app. | Una base de datos para que los hermanos vean lo mismo desde sus propios teléfonos. Ver el esquema más abajo, en esta misma sección. | `lib/store.ts` |
| **Pagos** | Con el enlace de Hotmart en `.env.local`, el botón de la pantalla de planes lleva a Hotmart. Sin enlace, solo simula (demo) y no cobra. | Tu producto en Hotmart y un aviso automático de pago (webhook) que active o desactive la cuenta. Hoy `/entrar` no valida la compra. | `lib/marca.ts` y `lib/cobro.ts`; una ruta nueva `app/api/hotmart/` |
| **Correos** | No se envía ninguno. | Resend (o similar) para el correo de acceso, la bienvenida, los avisos de cobro y las invitaciones a hermanos. | Ruta nueva `app/api/` |
| **Recordatorios** | La app muestra los avisos como "programados", pero no llegan al teléfono. | Un proceso que revise cada minuto qué dosis y citas se acercan y envíe correo o notificación. | Función programada en tu servidor |
| **Invitar hermanos** | El mensaje para invitar sale sin enlace (la ruta `/unirme` aún no existe). | Enlaces de invitación reales con códigos aleatorios generados por tu servidor, y con caducidad. Luego pon `INVITACION_CONECTADA = true` en `lib/oferta.ts`. | `components/app/screens/FamiliaScreen.tsx` y `lib/oferta.ts` |
| **Publicación** | Solo funciona en tu computador. | GitHub, Vercel y un dominio propio. | Sección 7 |

### Cómo conectar cada pieza

#### Acceso y cuentas

Pídele a tu IA: "Conecta el formulario de app/entrar/EntrarForm.tsx a Supabase Auth con correo y contraseña. La contraseña nunca debe guardarse en el navegador. Agrega límite de intentos, confirmación de correo y recuperación de contraseña. Protege /app para que solo entren usuarios con sesión y plan activo."

Comprueba cuando termine: sin sesión, entrar a `/app` te manda a `/entrar`; con 5 contraseñas malas seguidas, el sistema te frena.

#### Datos con Supabase

**Supabase** es un servicio que te da una base de datos y cuentas de usuario. Crea un proyecto gratis en <https://supabase.com>. En su editor SQL pega el bloque de abajo: es `supabase/schema.sql` seguido de `supabase/retencion.sql`. Si cambian esos archivos, usa los archivos, no esta copia. Cada tabla lleva **RLS** (Row Level Security: reglas que hacen que cada persona solo pueda ver las filas de su propio círculo familiar). Sin RLS, cualquiera podría leer los datos de salud de otras familias.

```sql
-- ESQUEMA DE SUPABASE para E-Cuidadores (círculos, miembros, medicinas, dosis, citas, notas).
-- Copiado del MANUAL-DEL-DUENO.md sección 6 (probado en un PostgreSQL real). Pégalo en el editor SQL de TU proyecto.
-- Léelo antes de ejecutarlo: cada tabla tiene RLS (seguridad por fila) y las funciones están restringidas.

-- Círculos familiares: cada círculo cuida a UNA persona mayor. created_by es quien paga (el organizador).
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  patient_name text not null check (char_length(patient_name) between 1 and 80),
  patient_age int check (patient_age between 1 and 120),
  relation text not null default 'Familiar mayor' check (char_length(relation) <= 40),
  allergies text[] not null default '{}',
  conditions text[] not null default '{}',
  doctor_name text not null default '' check (char_length(doctor_name) <= 80),
  doctor_phone text not null default '' check (char_length(doctor_phone) <= 30),
  emergency_name text not null default '' check (char_length(emergency_name) <= 80),
  emergency_phone text not null default '' check (char_length(emergency_phone) <= 30),
  -- Zona horaria del familiar mayor: los horarios de medicinas y citas se leen en ESTA zona,
  -- sin importar dónde viva cada hermano. Sin ella, un hermano en otro país vería dosis "atrasadas".
  timezone text not null default 'America/Bogota',
  default_remind_day_before boolean not null default true,
  default_remind_hours int not null default 3 check (default_remind_hours between 0 and 4),
  created_at timestamptz not null default now()
);
create index on public.circles (created_by);

-- Quién pertenece a cada círculo
create table public.members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text not null default '' check (char_length(role) <= 120),
  primary key (circle_id, user_id)
);
create index on public.members (user_id);

-- Medicinas
create table public.meds (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  dose text not null default '' check (char_length(dose) <= 80),
  times text[] not null check (cardinality(times) between 1 and 12),  -- ej: {'08:00','20:00'}
  freq jsonb not null,  -- {"kind":"daily"} | {"kind":"weekdays","days":[1,3,5]} | {"kind":"interval","every":3,"anchor":"2026-09-01"}
  notes text not null default '' check (char_length(notes) <= 300),
  giver_id uuid references auth.users(id) on delete set null,
  paused boolean not null default false,
  start_at timestamptz not null default now(),
  unique (circle_id, id)  -- permite que dose_logs apunte a (círculo, medicina) y nunca cruce familias
);
create index on public.meds (circle_id);
create index on public.meds (giver_id);

-- Dosis confirmadas: SIEMPRE con QUIÉN la registró y a qué hora (regla del producto: nunca "dada" sin autor).
-- given_by y given_by_name los FIJA EL SERVIDOR (trigger dose_logs_atribuir): given_by = quien tiene la sesión y
-- given_by_name = su nombre en members. El navegador no puede atribuir una dosis a otra persona.
-- given_by_name guarda el nombre de ese momento: el historial sigue completo si esa persona borra su cuenta.
create table public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null,
  med_id uuid not null,
  dose_date date not null,
  dose_time text not null check (dose_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),  -- hora programada 'HH:MM'
  given_by uuid references auth.users(id) on delete set null,  -- quien registró la dosis; null solo si esa persona borró su cuenta
  given_by_self boolean not null default false,  -- true si la propia persona mayor se la tomó
  given_by_name text not null check (char_length(given_by_name) between 1 and 80),
  given_at timestamptz not null default now(),
  unique (med_id, dose_date, dose_time),
  foreign key (circle_id, med_id) references public.meds (circle_id, id) on delete cascade
);
create index on public.dose_logs (circle_id, dose_date);

-- Citas
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  specialist text not null default '' check (char_length(specialist) <= 80),
  appt_date date not null,
  appt_time text not null check (appt_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  place text not null default '' check (char_length(place) <= 160),
  attendee_id uuid references auth.users(id) on delete set null,
  remind_day_before boolean not null default true,
  remind_hours_before int not null default 0 check (remind_hours_before between 0 and 4),
  status text not null default 'pendiente' check (status in ('pendiente','atendida','cancelada')),
  result text not null default '' check (char_length(result) <= 700)
);
create index on public.appointments (circle_id, appt_date);
create index on public.appointments (attendee_id);

-- Bitácora de novedades (author_name guarda el nombre de ese momento, igual que en dose_logs)
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  kind text not null check (kind in ('sintoma','animo','comida','otra')),
  body text not null check (char_length(body) between 1 and 600),
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 80),
  created_at timestamptz not null default now()
);
create index on public.notes (circle_id, created_at desc);
create index on public.notes (author_id);

-- Suscripción: la escribe SOLO tu servidor (clave de servicio) cuando Hotmart avisa un cambio.
-- Una fila por usuario. El estado sigue a Hotmart: nunca lo decide el navegador.
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null check (status in ('trial','active','past_due','canceled','expired','refunded','chargeback')),
  plan text not null default 'desconocido' check (plan in ('mensual','anual','desconocido')),  -- 'desconocido' si Hotmart no dice el plan: no se asume uno
  hotmart_subscriber_code text,
  current_period_end timestamptz,  -- hasta cuándo tiene acceso (también si canceló: conserva lo ya pagado)
  updated_at timestamptz not null default now()
);

-- Avisos de Hotmart ya procesados (evita procesar dos veces el mismo aviso y sirve de libro de ingresos).
-- Un mismo pago puede llegar en varios avisos (aprobado, completo...): tu servidor debe contarlo UNA sola vez.
create table public.payment_events (
  id bigint generated always as identity primary key,
  hotmart_transaction text not null,
  event text not null,           -- ej: PURCHASE_APPROVED, PURCHASE_REFUNDED, SUBSCRIPTION_CANCELLATION
  buyer_email text not null,
  amount_minor bigint,           -- monto en centavos (entero), nunca decimales
  currency text,                 -- código ISO, ej: USD, COP, MXN
  payload jsonb not null,
  processed_at timestamptz not null default now(),
  unique (hotmart_transaction, event)
);
-- Un solo COBRO por transacción: aunque lleguen varios avisos de pago (aprobado, completo...), solo uno puede tener importe positivo.
-- Los reembolsos y contracargos (importe negativo) no entran en este índice.
create unique index payment_events_un_cobro on public.payment_events (hotmart_transaction) where amount_minor > 0;

-- Libro de ingresos: suma por moneda (en unidades menores: centavos o pesos según la moneda). Cobros +, reembolsos y contracargos −.
create or replace view public.libro_ingresos as
  select currency, sum(amount_minor) as neto_unidades_menores, count(*) as movimientos
  from public.payment_events
  where amount_minor is not null
  group by currency;

-- Compras cuyo correo todavía no tiene cuenta: tu servidor las enlaza cuando esa persona confirma su correo (ver enlazar_compra_pendiente).
create table public.pending_purchases (
  buyer_email text primary key,
  status text not null check (status in ('trial','active','past_due','canceled','expired','refunded','chargeback')),
  plan text not null default 'desconocido' check (plan in ('mensual','anual','desconocido')),
  hotmart_subscriber_code text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Funciones auxiliares ────────────────────────────────────────────────────

-- ¿Este usuario pertenece a este círculo?
create or replace function public.is_member(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.circle_id = c and m.user_id = (select auth.uid())
  );
$$;

-- ¿La suscripción de este usuario está vigente? (trial, activa, en gracia por pago fallido, o cancelada pero ya pagada)
-- INTERNA: el navegador no la llama. Solo la usan las demás funciones (que sí corren con permiso de su dueño).
create or replace function public.suscripcion_vigente(u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = u
      and (
        s.status in ('trial','active','past_due')
        or (s.status = 'canceled' and s.current_period_end > now())
      )
  );
$$;

-- Lo que el navegador puede preguntar: SOLO por su propia suscripción (u tiene que ser auth.uid()).
create or replace function public.user_subscribed(u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (u = (select auth.uid())) is true and public.suscripcion_vigente(u);
$$;

-- ¿El círculo tiene al día la suscripción de su organizador? Los hermanos invitados NO pagan:
-- su acceso de escritura depende de la suscripción de quien creó el círculo.
-- Solo responde si quien pregunta es miembro del círculo: no revela si otros círculos están activos.
create or replace function public.circle_active(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_member(c) and exists (
    select 1 from public.circles ci
    where ci.id = c and ci.created_by is not null and public.suscripcion_vigente(ci.created_by)
  );
$$;

-- Al crear un círculo, quien lo crea entra como primer miembro.
create or replace function public.add_creator_as_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.members (circle_id, user_id, name, role)
  values (
    new.id,
    new.created_by,
    coalesce((select u.raw_user_meta_data ->> 'name' from auth.users u where u.id = new.created_by), 'Organizador'),
    'Organizador'
  );
  return new;
end;
$$;

create trigger circles_add_creator after insert on public.circles
for each row when (new.created_by is not null) execute function public.add_creator_as_member();

-- Ninguna de estas funciones debe poder llamarse sin haber iniciado sesión, y ninguna acepta un UUID ajeno.
-- Supabase concede EXECUTE a PUBLIC por defecto: por eso se revoca explícitamente.
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.suscripcion_vigente(uuid) from public, anon, authenticated;
revoke execute on function public.user_subscribed(uuid) from public, anon;
revoke execute on function public.circle_active(uuid) from public, anon;
revoke execute on function public.add_creator_as_member() from public, anon, authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.user_subscribed(uuid) to authenticated;
grant execute on function public.circle_active(uuid) to authenticated;
-- El libro de ingresos es solo para tu servidor y tu panel con clave de servicio.
revoke all on public.libro_ingresos from anon, authenticated;

-- ─── RLS: activar en TODAS las tablas ────────────────────────────────────────
alter table public.circles enable row level security;
alter table public.members enable row level security;
alter table public.meds enable row level security;
alter table public.dose_logs enable row level security;
alter table public.appointments enable row level security;
alter table public.notes enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;      -- sin políticas: solo tu servidor (clave de servicio)
alter table public.pending_purchases enable row level security;   -- sin políticas: solo tu servidor

-- ─── Políticas ───────────────────────────────────────────────────────────────
-- LEER: cualquier miembro del círculo, aunque la suscripción haya vencido (así puede llevarse sus datos).
-- ESCRIBIR: solo miembros Y con el círculo al día (circle_active).

create policy "ver mi circulo" on public.circles for select
  using (public.is_member(id) or created_by = (select auth.uid()));
create policy "crear circulo" on public.circles for insert
  with check (created_by = (select auth.uid()) and public.user_subscribed((select auth.uid())));
create policy "editar mi circulo" on public.circles for update
  using (public.is_member(id) and public.circle_active(id))
  with check (public.is_member(id) and public.circle_active(id));

-- Agregar o quitar miembros (invitaciones) se hace SOLO desde tu servidor con la clave de servicio.
create policy "ver miembros de mi circulo" on public.members for select using (public.is_member(circle_id));

create policy "ver medicinas" on public.meds for select using (public.is_member(circle_id));
create policy "crear medicinas" on public.meds for insert
  with check (public.is_member(circle_id) and public.circle_active(circle_id));
create policy "editar medicinas" on public.meds for update
  using (public.is_member(circle_id) and public.circle_active(circle_id))
  with check (public.is_member(circle_id) and public.circle_active(circle_id));
create policy "borrar medicinas" on public.meds for delete
  using (public.is_member(circle_id) and public.circle_active(circle_id));

create policy "ver citas" on public.appointments for select using (public.is_member(circle_id));
create policy "crear citas" on public.appointments for insert
  with check (public.is_member(circle_id) and public.circle_active(circle_id));
create policy "editar citas" on public.appointments for update
  using (public.is_member(circle_id) and public.circle_active(circle_id))
  with check (public.is_member(circle_id) and public.circle_active(circle_id));
create policy "borrar citas" on public.appointments for delete
  using (public.is_member(circle_id) and public.circle_active(circle_id));

create policy "ver dosis" on public.dose_logs for select using (public.is_member(circle_id));
-- Quien confirma una dosis queda como given_by: solo puede ser quien tiene la sesión (el trigger lo fija igual).
create policy "confirmar dosis" on public.dose_logs for insert
  with check (
    public.is_member(circle_id) and public.circle_active(circle_id)
    and given_by = (select auth.uid())
  );
create policy "deshacer dosis" on public.dose_logs for delete
  using (public.is_member(circle_id) and public.circle_active(circle_id));

create policy "ver notas" on public.notes for select using (public.is_member(circle_id));
create policy "escribir notas" on public.notes for insert
  with check (public.is_member(circle_id) and public.circle_active(circle_id) and author_id = (select auth.uid()));
create policy "editar mis notas" on public.notes for update
  using (author_id = (select auth.uid()) and public.is_member(circle_id) and public.circle_active(circle_id))
  with check (author_id = (select auth.uid()) and public.is_member(circle_id) and public.circle_active(circle_id));
create policy "borrar mis notas" on public.notes for delete
  using (author_id = (select auth.uid()) and public.is_member(circle_id));

-- La suscripción: cada quien solo LEE la suya. Nadie la escribe desde el navegador.
create policy "ver mi suscripcion" on public.subscriptions for select using (user_id = (select auth.uid()));

-- ─── Consentimientos (registro legal) ────────────────────────────────────────
-- Una fila por cada aceptación, ligada a la persona (no a una bandera del navegador), con la VERSIÓN del texto
-- (lib/legal.ts → LEGAL.version) y finalidades SEPARADAS: términos+privacidad+mayoría de edad, datos de salud,
-- y medición/marketing. Solo se agrega; retirar un permiso agrega una fila con withdrawn_at (no se edita lo anterior).
create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('terms_privacy_adult','health_data','analytics','marketing')),
  text_version text not null,            -- ej: '2026-10-10'
  locale text not null default 'es',
  origin text not null default 'signup', -- dónde se dio: signup, settings...
  given_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
alter table public.consents enable row level security;
create policy "ver mis consentimientos" on public.consents for select using (user_id = (select auth.uid()));
create policy "dar mis consentimientos" on public.consents for insert with check (user_id = (select auth.uid()));
-- Nota: el borrado de cuenta (auth.users) arrastra estas filas por "on delete cascade". Si tu abogado te pide
-- conservar la prueba de consentimiento un tiempo, guárdala anonimizada en otra tabla antes de borrar.

-- ─── Privilegios de tabla: solo lo que usa la app (RLS decide qué filas) ─────────────────────
-- Supabase concede a anon y authenticated TODOS los privilegios sobre public, incluido TRUNCATE, que RLS no filtra.
-- Se retiran y se conceden solo las operaciones que usa cada tabla. Suscripciones, compras y libro de ingresos
-- no tienen grant para el navegador: solo tu servidor (clave de servicio) los toca.
revoke all on all tables in schema public from anon, authenticated;
grant select, insert on public.circles to authenticated;   -- crear el círculo (política "crear circulo")
-- Del círculo el navegador solo puede editar estos campos (no created_by ni id).
grant update (patient_name, patient_age, relation, allergies, conditions, doctor_name, doctor_phone,
              emergency_name, emergency_phone, timezone, default_remind_day_before, default_remind_hours)
  on public.circles to authenticated;
grant select on public.members to authenticated;
grant select, insert, update, delete on public.meds to authenticated;
grant select, insert, delete on public.dose_logs to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert on public.consents to authenticated;

-- ─── Sin miembros no hay círculo ─────────────────────────────────────────────
-- Si se borra la cuenta de la última persona del círculo (derecho de supresión), los datos de salud del familiar
-- no pueden quedar huérfanos: al quedarse sin miembros, el círculo y todo lo que cuelga de él se borran.
create or replace function public.delete_circle_if_empty()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.members m where m.circle_id = old.circle_id) then
    delete from public.circles where id = old.circle_id;
  end if;
  return null;
end;
$$;
create trigger members_borrar_circulo_vacio
  after delete on public.members
  for each row execute function public.delete_circle_if_empty();

-- ─── Atribución y compras: lo fija el servidor, no el navegador ─────────────
-- Con sesión, quien registra una dosis o una nota queda como autor, con el nombre que tiene en members.
-- Sin sesión (tu servidor con la clave de servicio) se respetan los valores que envía tu servidor.
create or replace function public.dose_logs_atribuir()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  nombre text;
begin
  if (select auth.uid()) is not null then
    select m.name into nombre from public.members m
    where m.circle_id = new.circle_id and m.user_id = (select auth.uid());
    if nombre is null then
      raise exception 'sin permiso para registrar en este círculo' using errcode = '42501';
    end if;
    new.given_by := (select auth.uid());
    new.given_by_name := nombre;
  end if;
  return new;
end;
$$;
create trigger dose_logs_atribuir before insert on public.dose_logs
  for each row execute function public.dose_logs_atribuir();

create or replace function public.notes_atribuir()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  nombre text;
begin
  if (select auth.uid()) is not null then
    select m.name into nombre from public.members m
    where m.circle_id = new.circle_id and m.user_id = (select auth.uid());
    if nombre is null then
      raise exception 'sin permiso para escribir en este círculo' using errcode = '42501';
    end if;
    new.author_id := (select auth.uid());
    new.author_name := nombre;
  end if;
  return new;
end;
$$;
create trigger notes_atribuir before insert on public.notes
  for each row execute function public.notes_atribuir();

-- Una compra que llegó ANTES que la cuenta se enlaza cuando su dueño CONFIRMA el correo.
-- Así nadie reclama una compra ajena creando una cuenta con un correo que no es suyo.
create or replace function public.enlazar_compra_pendiente()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.subscriptions (user_id, status, plan, hotmart_subscriber_code, current_period_end, updated_at)
  select new.id, p.status, p.plan, p.hotmart_subscriber_code, p.current_period_end, now()
  from public.pending_purchases p
  where p.buyer_email = lower(new.email)
  on conflict (user_id) do nothing;
  delete from public.pending_purchases where buyer_email = lower(new.email);
  return new;
end;
$$;
create trigger auth_users_enlazar_compra after insert or update of email_confirmed_at on auth.users
  for each row when (new.email_confirmed_at is not null)
  execute function public.enlazar_compra_pendiente();

revoke execute on function public.dose_logs_atribuir() from public, anon, authenticated;
revoke execute on function public.notes_atribuir() from public, anon, authenticated;
revoke execute on function public.enlazar_compra_pendiente() from public, anon, authenticated;

-- ── supabase/retencion.sql (ejecútalo después del anterior, en el mismo editor SQL) ──
-- RETENCIÓN — cambios de base de datos para sostener las funciones de retención de la app.
-- Se ejecutan DESPUÉS de supabase/schema.sql, en el editor SQL de TU proyecto.
-- ✅ Probado: `npm test` ejecuta schema.sql + este archivo en un PostgreSQL real en memoria (supabase/sql.test.ts).
-- Aun así, pruébalos primero en un proyecto vacío (o una rama de Supabase) antes de usarlos con clientes.

-- 1) Una dosis puede quedar anotada como NO dada, con su motivo (null = se dio).
--    given_by / given_by_name pasan a significar "quién lo registró". La racha cuenta ambos registros.
alter table public.dose_logs
  add column if not exists skipped_reason text
  check (skipped_reason in ('rechazo','olvido','ausente','suspendida','otro'));

-- 2) Última visita de cada persona (alimenta "mientras no estabas") y hitos ya celebrados por círculo.
alter table public.members add column if not exists last_seen_at timestamptz;
alter table public.circles add column if not exists celebrated_milestones text[] not null default '{}';

-- 3) Círculos con suscripción activa y sin actividad hace 14 días o más (el "pagador fantasma").
--    Es el segmento más recuperable: ya pagó y solo perdió el hábito. SOLO servidor (cron + correo).
create or replace view public.retention_ghost_circles as
with actividad as (
  select
    c.id as circle_id,
    c.created_by as user_id,
    greatest(
      coalesce((select max(l.given_at) from public.dose_logs l where l.circle_id = c.id), 'epoch'::timestamptz),
      coalesce((select max(n.created_at) from public.notes n where n.circle_id = c.id), 'epoch'::timestamptz),
      coalesce((select max(m.last_seen_at) from public.members m where m.circle_id = c.id), 'epoch'::timestamptz)
    ) as last_activity_at
  from public.circles c
)
select a.circle_id, a.user_id, s.status, s.plan, a.last_activity_at
from actividad a
join public.subscriptions s on s.user_id = a.user_id
where s.status in ('trial', 'active')
  and a.last_activity_at < now() - interval '14 days';

revoke all on public.retention_ghost_circles from anon, authenticated;

-- 4) Datos del correo semanal del círculo (solo conteos: nunca nombres de medicinas ni notas).
--    Usa la fecha del servidor; si tu familiar vive en otra zona horaria, ajusta con circles.timezone.
create or replace function public.weekly_digest(c uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'dosis_dadas', (
      select count(*) from public.dose_logs l
      where l.circle_id = c and l.skipped_reason is null and l.dose_date >= current_date - 6
    ),
    'dosis_no_dadas', (
      select count(*) from public.dose_logs l
      where l.circle_id = c and l.skipped_reason is not null and l.dose_date >= current_date - 6
    ),
    'novedades', (
      select count(*) from public.notes n
      where n.circle_id = c and n.created_at >= now() - interval '7 days'
    ),
    'por_miembro', coalesce((
      select jsonb_agg(jsonb_build_object('nombre', t.nombre, 'dosis', t.n) order by t.n desc)
      from (
        select l.given_by_name as nombre, count(*) as n
        from public.dose_logs l
        where l.circle_id = c and l.skipped_reason is null and l.dose_date >= current_date - 6
        group by l.given_by_name
      ) t
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.weekly_digest(uuid) from public, anon, authenticated;
```

Qué hace este esquema, en simple:

- **Un círculo por persona mayor.** Quien lo crea (el organizador, el que paga) entra solo como primer miembro. Los hermanos se agregan desde tu servidor con la clave de servicio (invitaciones), nunca desde el navegador.
- **Leer** lo puede hacer cualquier miembro del círculo, incluso si la suscripción venció (así puede llevarse su información). **Escribir** solo los miembros mientras el organizador tenga la suscripción al día. Los hermanos invitados no pagan: su acceso depende del pago del organizador.
- **La suscripción y los avisos de pago** (`subscriptions`, `payment_events`, `pending_purchases`) solo las escribe tu servidor. Desde el navegador nadie puede darse acceso a sí mismo.
- **Nombres guardados junto a cada dosis y cada nota** (`given_by_name`, `author_name`): si una persona borra su cuenta, el historial del círculo no pierde el "quién". Esto hace posible borrar cuentas sin romper la base de datos.
- **Zona horaria del familiar mayor** (`circles.timezone`): las horas de las dosis y de las citas se leen en esa zona, no en la del teléfono de cada hermano. Hoy la plantilla usa la hora del dispositivo (todo es local). Al conectar tu servidor, pídele a tu IA que calcule "atrasada" y "hoy" con esa zona; si no, un hermano que vive en otro país verá dosis atrasadas que no lo están.

Después, pídele a tu IA: "Reescribe lib/store.ts para leer y escribir en Supabase con estas tablas, manteniendo los mismos nombres de acciones (confirmDose, saveMed, saveAppt, saveNote…). La acción confirmDose debe seguir exigiendo quién dio la dosis y a qué hora, y guardar su nombre en given_by_name. saveNote debe guardar author_name. Los horarios se calculan con la zona horaria del círculo". Las pantallas no cambian porque todas hablan solo con `lib/store.ts`.

**Cómo comprobar que los datos están protegidos** (haz esto antes de vender, con dos cuentas de prueba, A y B, cada una con su propio círculo):

1. La cuenta B **no puede ver** ninguna fila de la cuenta A (medicinas, citas, notas, dosis, círculo).
2. La cuenta B no puede crear medicinas, notas ni dosis dentro del círculo de A (debe salir un error de política de seguridad).
3. Una cuenta sin suscripción vigente puede ver sus datos pero no agregar ni cambiar nada.
4. Ninguna cuenta puede cambiar su propia fila de `subscriptions` desde el navegador.
5. Sin iniciar sesión (con la clave pública "anon"), no se puede leer nada.

Este esquema fue revisado en la auditoría final y probado en una base PostgreSQL real con estos mismos casos. Si le pides a tu IA que lo modifique, pídele que repita esas cinco comprobaciones.

#### Borrar la cuenta y exportar los datos

Los textos legales prometen que la persona puede pedir una copia de sus datos y borrar su cuenta. La plantilla no trae esas dos funciones (los datos viven en el navegador), así que al conectar tu servidor debes agregarlas:

- **Exportar**: un botón en Familia que descargue un archivo con las medicinas, citas, notas, dosis y el resumen del círculo. Pídele a tu IA: "Agrega en Familia un botón Descargar mis datos que genere un archivo JSON con todo lo del círculo del usuario".
- **Borrar**: un botón "Eliminar mi cuenta" con confirmación doble. Debe borrar al usuario en Supabase Auth desde una ruta de servidor (con la clave de servicio) y cancelar la suscripción en Hotmart. Gracias al esquema, el historial del círculo conserva los nombres. Si el organizador borra su cuenta y nadie más pagará, decide con tu abogado cuánto tiempo conservas el círculo (los textos legales dicen 30 días) y programa el borrado de los círculos que queden sin organizador.
- Al **cerrar sesión**, borra también lo que la app tenga guardado en el navegador: en un computador compartido no debe quedar información de salud de nadie.

#### Pagos con Hotmart

**Hotmart** es la plataforma que cobra por ti. El **webhook** es el aviso automático que Hotmart envía a tu app cuando alguien paga, cancela o pide reembolso.

**Antes de escribir una sola línea, confirma en tu panel de Hotmart estas cuatro cosas** (las páginas de la plantilla las prometen, y si Hotmart no las permite tienes que cambiar el texto):

1. **La prueba gratis de 7 días.** Según la ayuda de Hotmart (consultada en la auditoría, septiembre de 2026), el período gratuito solo aplica a productos de suscripción del *Hotmart Club* y a compras con **tarjeta de crédito**; permite de 1 a 30 días, y el mismo correo solo puede usarlo una vez. Si tu producto no cumple eso, la promesa "7 días gratis" es falsa: cambia el texto de la página de ventas, de la pantalla de planes y de los legales antes de vender.
2. **Medios de pago.** Como la prueba gratis exige tarjeta, la pregunta frecuente de la página de ventas que dice que se puede pagar con OXXO o PIX debe corregirse. Además, esos medios no se cobran solos cada mes en una suscripción. Deja en la respuesta solo lo que tu panel de Hotmart muestre realmente en tu país.
3. **Garantía de 7 días.** Hotmart admite 7, 15, 21 o 30 días, y en suscripciones solo cubre el **primer cobro**, no las renovaciones (así lo dicen las páginas de la plantilla). Configúrala en 7 (el mismo número que `GARANTIA_DIAS`) y comprueba desde qué día cuenta.
4. **Cancelación.** La persona cancela desde su área de compras de Hotmart o escribiéndote; no existe un botón de cancelar dentro de tu app a menos que lo construyas llamando a la API de Hotmart. La página de ventas dice "desde tu cuenta": ajusta el texto a lo que realmente hay.

Pasos:

1. Crea tu producto de suscripción en Hotmart con los mismos precios de la plantilla (mensual y anual), la prueba y la garantía anteriores. Debe coincidir con lo que dicen la página de ventas y `/reembolsos`.
2. Pon el enlace de pago en `.env.local` (`NEXT_PUBLIC_HOTMART_CHECKOUT_URL` y, si lo tienes, `NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL_URL`) y vuelve a publicar: el botón del paywall ya lleva a Hotmart, no hace falta tocar el código. Cuida la promesa "Te avisamos por correo el día 5, antes del cobro": Hotmart avisa al comprador antes de un cobro automático con su propio correo, pero el correo del día 5 que promete la plantilla (con el interruptor) lo tienes que enviar tú con Resend. Si no vas a enviarlo, quita el interruptor y esa línea del cronograma.
3. Pídele a tu IA: "Crea app/api/hotmart/route.ts que reciba el webhook de Hotmart. Debe: (a) leer el encabezado X-HOTMART-HOTTOK y compararlo con HOTMART_HOTTOK con una comparación segura, y responder 401 si no coincide; (b) guardar cada aviso en payment_events con la clave única (transacción, evento) y no procesarlo si ya existe; (c) contar un mismo pago UNA sola vez aunque lleguen varios avisos (por ejemplo PURCHASE_APPROVED y PURCHASE_COMPLETE); (d) validar que el producto, el plan, el importe y la moneda sean los tuyos y rechazar los demás; (e) buscar al usuario por el correo del comprador y, si aún no tiene cuenta, guardarlo en pending_purchases para enlazarlo cuando cree su cuenta con ese mismo correo; (f) actualizar subscriptions con la clave de servicio, con estos estados: trial, active, past_due (PURCHASE_DELAYED), canceled (conserva el acceso hasta current_period_end), refunded y chargeback; (g) que un aviso viejo reenviado nunca reactive una compra ya reembolsada o con contracargo; (h) si algo falla a mitad, responder con error para que Hotmart reintente".
4. En Hotmart configura la dirección del webhook (`https://TU-DOMINIO/api/hotmart`) y guarda tu HOTTOK en las variables de entorno (sección 7), nunca en el código.
5. Haz una compra de prueba real (con tu propia tarjeta, o con el modo de pruebas de Hotmart si lo tienes) y comprueba: pago, acceso, cancelación durante la prueba, cancelación después de pagar, reembolso y un aviso repetido. Hasta hacerlo, no puedes decir que el cobro funciona.

#### Correos con Resend

Crea una cuenta en <https://resend.com>, verifica tu dominio y crea una clave. Pídele a tu IA: "Envía con Resend el correo de bienvenida, el enlace de acceso y la invitación a hermanos desde rutas de servidor. La clave RESEND_API_KEY solo se lee en el servidor". Verifica que los correos no caigan en spam (Resend te guía con SPF y DKIM, que son dos registros que se agregan a tu dominio).

#### Recordatorios reales

Pídele a tu IA: "Crea una función programada (cron de Vercel o de Supabase) que cada 5 minutos busque dosis y citas próximas según los recordatorios de cada cita y envíe el aviso por correo a quien corresponda, sin duplicar avisos. Las horas se interpretan en la zona horaria del círculo (circles.timezone)". Empieza por correo; las notificaciones al teléfono vienen después.

Mientras esta función no exista, en la app **no se puede decir** "te avisamos", "ya le avisamos a tus hermanos" ni "recibirás un aviso": hoy la plantilla solo muestra los avisos como programados. Los textos de la plantilla que lo dicen están en la lista de la sección 12; revísalos.

---

## 7. Publicar tu app

1. **GitHub**: crea una cuenta en <https://github.com>, un repositorio **privado** y sube el proyecto. Pídele a tu IA que te guíe. Comprueba que el archivo `.env.local` no aparezca en el repositorio.
2. **Vercel**: crea una cuenta en <https://vercel.com>, importa el repositorio y pulsa Deploy. Vercel publica y cada vez que subas cambios a GitHub se actualiza solo.
3. **Variables de entorno**: en Vercel, Settings, Environment Variables, agrega las de `.env.example`. Las que empiezan con `NEXT_PUBLIC_` las puede leer cualquiera. Las secretas (`SUPABASE_SERVICE_ROLE_KEY`, `HOTMART_HOTTOK`, `RESEND_API_KEY`) **nunca** llevan ese prefijo.
4. **Dominio**: compra uno (GoDaddy, Namecheap o Cloudflare), agrégalo en Vercel, Settings, Domains, y copia los registros que Vercel te indique en tu proveedor de dominio. Después cambia `NEXT_PUBLIC_SITE_URL` por tu dirección real.
5. **Cabeceras de seguridad**: ya vienen en `next.config.ts`. Si conectas un servicio nuevo (por ejemplo Supabase), agrega su dirección en la línea `connect-src` para que el navegador lo permita. Está explicado en el mismo archivo.

Si pegaste una clave secreta en un chat, en un correo o en el código por error: considérala expuesta. Crea una nueva en el panel del servicio y desactiva la vieja.

---

## 8. Lista de verificación de seguridad antes de vender

Marca todo antes de aceptar el primer pago.

- [ ] La contraseña se guarda con hash en el servidor y hay límite de intentos.
- [ ] Toda tabla de la base de datos tiene RLS activado y lo probé con dos cuentas distintas.
- [ ] `/app` no se puede abrir sin sesión ni sin suscripción activa. La comprobación ocurre en el servidor, no solo en la pantalla.
- [ ] El webhook de Hotmart verifica el HOTTOK y no procesa dos veces el mismo aviso.
- [ ] Ninguna clave secreta está en el código ni empieza con `NEXT_PUBLIC_`.
- [ ] `.env.local` está en `.gitignore` y no está en GitHub.
- [ ] Los correos llegan a la bandeja de entrada (no a spam).
- [ ] La garantía de Hotmart (7 días) coincide con la página de ventas y los reembolsos.
- [ ] Hay una forma clara de cancelar y de eliminar la cuenta con sus datos.
- [ ] Un abogado de mi país revisó Privacidad, Términos y Reembolsos, y puse mis datos reales de contacto.
- [ ] Avisé a mis usuarios, dentro de la app, que no reemplaza la atención médica.
- [ ] Probé la app completa en un teléfono real, con conexión lenta y sin conexión.
- [ ] Corrí `npm test`, `npx tsc --noEmit` y `npm run build` sin errores.
- [ ] Hice una compra de prueba de principio a fin (pago, acceso, cancelación, reembolso).
- [ ] Tengo una copia de seguridad automática de la base de datos activada.
- [ ] Corrí las cinco comprobaciones de datos protegidos de la sección 6 con dos cuentas de prueba.
- [ ] La pantalla de acceso ya no acepta cualquier correo y contraseña: en la plantilla, cualquier correo con una contraseña de 8 o más caracteres "entra", y `/app` abre sin sesión. Esto es solo una simulación y debe desaparecer antes de publicar.
- [ ] Los límites de intentos de contraseña están en el servidor (en la plantilla el bloqueo de 60 segundos se salta recargando la página).
- [ ] Confirmé en Hotmart que existe la prueba de 7 días para mi producto y que los medios de pago de la respuesta frecuente son reales (sección 6).
- [ ] Ningún texto de la página dice "te avisamos" o "al instante" sin que exista el proceso que lo cumple (sección 12).
- [ ] Puedo exportar y borrar la cuenta de una persona, y al cerrar sesión no queda información de salud en el navegador.
- [ ] Corrí `npm audit --omit=dev` y no hay vulnerabilidades altas ni críticas.

---

## 9. Textos legales: revísalos con un abogado

Las tres páginas (`/privacidad`, `/terminos`, `/reembolsos`) son un **borrador serio y completo**, pero no son asesoría legal. Las leyes cambian de un país a otro, sobre todo en datos de salud. Antes de vender:

1. Lleva las tres páginas a un abogado de tu país que conozca protección de datos.
2. Cambia el correo de contacto y, si tu ley lo exige, agrega el nombre de tu empresa o el tuyo y tu dirección. Los textos no traen esos datos a propósito.
3. En Términos, la ley aplicable dice "la legislación del país donde se presta el servicio". Deja escrito tu país.
4. Actualiza la fecha de "Última actualización" en cada página cuando cambies algo.
5. Si conectas cualquier servicio nuevo que reciba datos de tus usuarios (por ejemplo analítica), agrégalo en Privacidad.

---

## 10. Comandos útiles

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Enciende la app en tu computador |
| `npm test` | Corre las pruebas automáticas (deben salir todas en verde) |
| `npx tsc --noEmit` | Busca errores de tipos sin generar archivos |
| `npm run lint` | Revisa el estilo del código |
| `npm run build` | Prepara la versión de publicación. Si falla, no publiques |

Cuando algo falle, copia el mensaje de error completo y pégalo en el chat de tu IA junto con el nombre del archivo. Casi siempre lo resuelve en el primer intento.

---

## 11. Si algo sale mal

- **La app no abre**: confirma que `npm run dev` sigue corriendo y que entras a `http://localhost:3000`.
- **Veo datos raros o una pantalla en blanco**: abre la app en una ventana privada, o en Familia pulsa "Restablecer datos de ejemplo".
- **Cambié un color y no se nota**: guarda el archivo y recarga con `Ctrl + F5`.
- **Un servicio nuevo no carga (mapas, analítica, Supabase)**: probablemente falta agregar su dirección en la política de seguridad de `next.config.ts` (sección 7, punto 5).

---

## 12. Lo que la plantilla promete y qué debes tener funcionando antes de venderlo

La página de ventas, la pantalla de planes y la app usan estas frases. En la plantilla son de demostración. Antes de venderla, cada una debe ser verdad para tu producto real, o cámbiala. (Es tu registro de promesas: si cambias un precio o una función, vuelve aquí.)

| Frase en la plantilla | Dónde aparece | Qué debe existir para que sea cierta |
|---|---|---|
| "7 días gratis. Hoy no pagas nada, primer cobro el día 7" | Ventas, planes, legales | Prueba gratis activa en Hotmart (solo tarjeta, ver sección 6) |
| "Garantía de 7 días" (solo el primer cobro) | Ventas, planes, Reembolsos | Garantía de 7 días configurada en Hotmart |
| "Cancelas cuando quieras desde tu cuenta" | Preguntas frecuentes de la página de ventas | Hoy se cancela desde Hotmart o por correo (así lo dicen Términos y Reembolsos). Cambia la frase a "desde tu área de compras de Hotmart" o construye el botón |
| "Te avisamos por correo el día 5, antes del cobro" | Pantalla de planes | Un correo tuyo el día 5 (Resend + tarea programada) o quitar el interruptor |
| "Recordatorios de medicamentos y citas, un día antes y horas antes"; "Te avisamos…"; "Ya le avisamos a tus hermanos que tomaste tu pastilla" | Ventas, Hoy, Citas, Modo simple | La función de recordatorios y avisos de la sección 6. Sin ella, cambia a "queda anotado y tus hermanos lo ven en la app" |
| "Todos los hermanos lo ven al instante" | Ventas | Base de datos compartida con actualización en vivo (Supabase Realtime) o "lo ven al abrir la app" |
| Plantilla hoy: "Hoy lo que escribes se guarda solo en este dispositivo y no se envía a ningún servidor". Con sincronización: "Solo las personas que tú invitas pueden verlos. Nadie más tiene acceso" | Preguntas frecuentes, Privacidad. La versión con sincronización sale solo con `SINCRONIZACION_CONECTADA = true` | RLS probado (sección 6) y aceptar que tu equipo técnico puede acceder por soporte. Sugerencia: "Solo las personas que invitas al círculo pueden verlos dentro de la app" |
| "Hermanos ilimitados gratis" | Ventas | Sin tope técnico; si pones uno (por costo), dilo |
| "Sigue por US$0.22 al día" | Ventas | 79.90 dividido entre 365 da 0.219, que se muestra como US$0.22. Con los precios sugeridos, el texto sale solo desde `lib/oferta.ts`. Si cambias precios, revisa que el texto siga siendo exacto |
| "2 meses gratis" (`textoMesesGratis`) | Ventas, planes | Sale de los precios en `lib/oferta.ts`. Con los precios sugeridos, 12 × 7.99 = 95.88 contra 79.90 ahorra 15.98, que son 2 mensualidades, y el texto dice 2. Si cambias precios, el texto cambia solo |
| "Puedes pagar en cuotas o con OXXO/PIX" | Preguntas frecuentes | Solo lo que Hotmart muestre en tu país y permita en suscripción con prueba (ver sección 6) |
| "Ya puedes entrar desde cualquier dispositivo" | Acceso | Cuentas reales en tu servidor (hoy los datos viven solo en el navegador) |
| "Pago seguro… procesado por Hotmart" | Planes, pie de página | El botón debe llevar de verdad al pago de Hotmart |
| "Armarla toma poco tiempo" | Ventas | Comprueba el tiempo real del recorrido con una persona nueva |

No inventes testimonios, cifras de usuarios ni logos. La plantilla no trae ninguno a propósito.

---

## 13. Mantenimiento: lo que no debes olvidar

- **Claves**: cámbialas cada 6 meses y de inmediato si una se compartió por error.
- **Dominio**: anota la fecha de renovación; perderlo tumba la app y los correos.
- **Copias de seguridad**: cada 3 meses restaura una copia en un proyecto de prueba y comprueba que los datos estén completos.
- **Dependencias**: cada mes corre `npm audit --omit=dev` y actualiza lo que salga con riesgo alto.
- **Costos**: cada mes compara lo que pagas (Supabase, Vercel, Resend) con lo que cobras.
- **Textos legales**: revísalos cuando cambies un servicio, un precio o una función, y actualiza la fecha.


---

## 14. Retención: lo que ya viene hecho y lo que conectas tú

La plantilla trae las funciones que hacen que un círculo use la app todos los días y siga pagando: racha del círculo con comodines, registro honesto de dosis no dadas, la semana del círculo, hitos, "mientras no estabas", primeros pasos, invitar a un hermano, la pantalla **Tu suscripción** (valor recibido, anual, cancelar sin esconderse con una pregunta de ayuda) y el aviso de pago pendiente. Todo funciona con datos locales.

- **Qué hace cada pieza, la evidencia y lo que NO se hizo:** `docs/retencion/ESTRATEGIA.md`.
- **Correos listos para Resend:** `docs/retencion/CORREOS.md`.
- **Base de datos:** `supabase/retencion.sql` (después de `schema.sql`).
- **Enlaces de Hotmart y cupón:** `lib/marca.ts` y `.env.local`.
- **Reglas que no se rompen:** nada de culpa ni de "nos abandonaste"; nunca una pausa que no pause el cobro; cancelar siempre a un toque; nombres de medicinas jamás en un correo.
