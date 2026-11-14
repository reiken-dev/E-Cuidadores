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
