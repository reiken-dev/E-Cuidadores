-- CRON DE RETENCIÓN — bajas, registro de envíos y candidatos (ECU-6).
-- Ejecútalo en el editor SQL de TU proyecto DESPUÉS de supabase/schema.sql, retencion.sql, permisos-service-role.sql y
-- vigencia-y-correo.sql (usa suscripcion_vigente, retention_ghost_circles y weekly_digest). Es idempotente.
-- ✅ Probado: `npm test` lo ejecuta en un PostgreSQL real en memoria (supabase/sql.test.ts).
--
-- Todo esto lo usa SOLO el servidor (cron, página de baja) con la clave de servicio: el navegador no lee ni escribe aquí.
-- Los correos de retención son de marketing: respetan la baja, salen como máximo UNO al día por persona y cada
-- secuencia se envía una sola vez por «clave» (episodio de inactividad, o semana). Solo conteos: nunca medicinas,
-- notas ni nombres de la familia.

create table if not exists public.correo_bajas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.correo_envios (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  secuencia text not null check (secuencia in ('pagador_fantasma', 'resumen_semanal')),
  clave text not null check (char_length(clave) <= 40),
  enviado_en timestamptz not null default now(),
  unique (user_id, secuencia, clave)
);
create index if not exists correo_envios_usuario_dia on public.correo_envios (user_id, enviado_en);

alter table public.correo_bajas enable row level security;
alter table public.correo_envios enable row level security;
revoke all on public.correo_bajas from anon, authenticated;
revoke all on public.correo_envios from anon, authenticated;
grant select, insert, update, delete on public.correo_bajas to service_role;
grant select, insert, update, delete on public.correo_envios to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Reserva el envío de un correo: true = se puede enviar (queda anotado); false = no.
-- No se envía si la persona se dio de baja, si ya recibió CUALQUIER correo hoy, o si esa secuencia ya salió para esa clave.
create or replace function public.reservar_envio(p_user uuid, p_secuencia text, p_clave text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  -- Dos corridas del cron a la vez no pueden reservar dos veces para la misma persona.
  perform pg_advisory_xact_lock(hashtext('correo:' || p_user::text));
  if exists (select 1 from public.correo_bajas b where b.user_id = p_user) then return false; end if;
  if exists (
    select 1 from public.correo_envios e
    where e.user_id = p_user and e.enviado_en >= date_trunc('day', now())
  ) then return false; end if;
  insert into public.correo_envios (user_id, secuencia, clave) values (p_user, p_secuencia, p_clave)
    on conflict (user_id, secuencia, clave) do nothing;
  return found;
end; $$;

-- Si el envío falló, se deshace la reserva para poder intentarlo en la siguiente corrida.
create or replace function public.liberar_envio(p_user uuid, p_secuencia text, p_clave text)
returns void language sql security definer set search_path = '' as $$
  delete from public.correo_envios where user_id = p_user and secuencia = p_secuencia and clave = p_clave;
$$;

-- Baja de los correos de marketing (idempotente). Los de cuenta y cobro no se pueden desactivar.
create or replace function public.darse_de_baja(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.correo_bajas (user_id) values (p_user) on conflict (user_id) do nothing;
$$;

-- Pagador fantasma: el organizador de un círculo con suscripción vigente, 14+ días sin actividad y que ya existe hace
-- 14+ días. (La vista retention_ghost_circles cuenta como «sin actividad» a un círculo recién creado: sin esa
-- condición, quien acaba de empezar recibiría el correo el día 0.) clave = fecha de la última actividad: un correo por
-- episodio de inactividad. Solo correos CONFIRMADOS.
create or replace function public.candidatos_pagador_fantasma(p_limite int default 200)
returns table (user_id uuid, email text, clave text)
language sql stable security definer set search_path = '' as $$
  select g.user_id, u.email::text, to_char(g.last_activity_at, 'YYYY-MM-DD')
  from public.retention_ghost_circles g
  join public.circles c on c.id = g.circle_id
  join auth.users u on u.id = g.user_id and u.email_confirmed_at is not null
  where c.created_at < now() - interval '14 days'
    and public.suscripcion_vigente(g.user_id)
    and not exists (select 1 from public.correo_bajas b where b.user_id = g.user_id)
    and not exists (
      select 1 from public.correo_envios e
      where e.user_id = g.user_id and e.secuencia = 'pagador_fantasma' and e.clave = to_char(g.last_activity_at, 'YYYY-MM-DD')
    )
  order by g.last_activity_at
  limit greatest(1, least(coalesce(p_limite, 200), 500));
$$;

-- Resumen semanal: todos los miembros de círculos con suscripción vigente, solo si hubo actividad en la semana.
-- clave = semana ISO. Solo conteos (weekly_digest): nunca medicinas, notas ni nombres.
create or replace function public.candidatos_resumen_semanal(p_limite int default 200)
returns table (user_id uuid, email text, clave text, dosis int, no_dadas int)
language sql stable security definer set search_path = '' as $$
  with resumen as (
    select ci.id as circle_id, public.weekly_digest(ci.id) as j
    from public.circles ci
    where ci.created_by is not null and public.suscripcion_vigente(ci.created_by)
  )
  select m.user_id, u.email::text, to_char(current_date, 'IYYY-"W"IW'),
         (r.j ->> 'dosis_dadas')::int, (r.j ->> 'dosis_no_dadas')::int
  from resumen r
  join public.members m on m.circle_id = r.circle_id
  join auth.users u on u.id = m.user_id and u.email_confirmed_at is not null
  where (r.j ->> 'dosis_dadas')::int + (r.j ->> 'dosis_no_dadas')::int + (r.j ->> 'novedades')::int > 0
    and not exists (select 1 from public.correo_bajas b where b.user_id = m.user_id)
    and not exists (
      select 1 from public.correo_envios e
      where e.user_id = m.user_id and e.secuencia = 'resumen_semanal' and e.clave = to_char(current_date, 'IYYY-"W"IW')
    )
  order by m.user_id
  limit greatest(1, least(coalesce(p_limite, 200), 500));
$$;

-- Solo el servidor (service_role) las ejecuta.
revoke execute on function public.reservar_envio(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.liberar_envio(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.darse_de_baja(uuid) from public, anon, authenticated;
revoke execute on function public.candidatos_pagador_fantasma(int) from public, anon, authenticated;
revoke execute on function public.candidatos_resumen_semanal(int) from public, anon, authenticated;
grant execute on function public.reservar_envio(uuid, text, text) to service_role;
grant execute on function public.liberar_envio(uuid, text, text) to service_role;
grant execute on function public.darse_de_baja(uuid) to service_role;
grant execute on function public.candidatos_pagador_fantasma(int) to service_role;
grant execute on function public.candidatos_resumen_semanal(int) to service_role;
