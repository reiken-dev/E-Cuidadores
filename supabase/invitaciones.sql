-- INVITACIONES — que el organizador invite a sus hermanos con un enlace (ECU-9).
-- Ejecútalo en el editor SQL de TU proyecto DESPUÉS de supabase/schema.sql, retencion.sql, permisos-service-role.sql
-- y datos-reales.sql. Es idempotente: se puede ejecutar más de una vez.
-- ✅ Probado: `npm test` lo ejecuta en un PostgreSQL real en memoria (supabase/sql.test.ts).
--
-- Cómo funciona: el navegador NUNCA escribe aquí ni en members. Las tres funciones las llama solo el servidor de la app
-- con la clave de servicio (rol service_role), que antes comprueba la sesión con getUser().
-- Un solo código activo por círculo; vale 7 días; el organizador lo puede revocar.

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index if not exists invitations_circle on public.invitations (circle_id);
alter table public.invitations enable row level security;

-- Solo quien creó el círculo ve sus invitaciones (el resto de miembros no necesita el código).
drop policy if exists "ver mis invitaciones" on public.invitations;
create policy "ver mis invitaciones" on public.invitations for select
  using (exists (
    select 1 from public.circles c
    where c.id = circle_id and c.created_by = (select auth.uid())
  ));
revoke all on public.invitations from anon, authenticated;
grant select on public.invitations to authenticated;
grant select, insert, update, delete on public.invitations to service_role;

-- Crea la invitación (7 días) y revoca la que hubiera activa. Solo si p_user creó el círculo; si no, devuelve null.
create or replace function public.crear_invitacion(p_circle uuid, p_user uuid, p_code text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  vence timestamptz := now() + interval '7 days';
begin
  perform 1 from public.circles where id = p_circle and created_by = p_user for update;
  if not found then return null; end if;
  update public.invitations set revoked_at = now()
    where circle_id = p_circle and revoked_at is null and expires_at > now();
  insert into public.invitations (circle_id, code, created_by, expires_at)
    values (p_circle, p_code, p_user, vence);
  return vence;
end; $$;

-- Revoca una invitación. Solo la puede revocar quien creó el círculo. true si se revocó.
create or replace function public.revocar_invitacion(p_id uuid, p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  filas int;
begin
  update public.invitations i set revoked_at = now()
    where i.id = p_id and i.revoked_at is null
      and exists (select 1 from public.circles c where c.id = i.circle_id and c.created_by = p_user);
  get diagnostics filas = row_count;
  return filas > 0;
end; $$;

-- Une a p_user al círculo del código. Devuelve 'ok', 'invalida' (no existe, vencido o revocado: no se distingue),
-- 'lleno' (12 miembros) o 'ya_en_circulo' (ya pertenece a otro círculo). Si ya es miembro de ese círculo, 'ok'.
create or replace function public.unirse_con_codigo(p_code text, p_user uuid, p_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  circulo uuid;
  cuantos int;
  nombre text := btrim(coalesce(p_name, ''));
begin
  if char_length(nombre) not between 1 and 80 then return 'invalida'; end if;
  select i.circle_id into circulo from public.invitations i
    where i.code = p_code and i.revoked_at is null and i.expires_at > now();
  if circulo is null then return 'invalida'; end if;
  -- Bloquea el círculo: dos personas entrando a la vez no pasan del tope.
  perform 1 from public.circles where id = circulo for update;
  if not found then return 'invalida'; end if;
  if exists (select 1 from public.members where circle_id = circulo and user_id = p_user) then return 'ok'; end if;
  if exists (select 1 from public.members where user_id = p_user) then return 'ya_en_circulo'; end if;
  select count(*) into cuantos from public.members where circle_id = circulo;
  if cuantos >= 12 then return 'lleno'; end if;
  insert into public.members (circle_id, user_id, name, role) values (circulo, p_user, nombre, 'Hermano/a');
  return 'ok';
end; $$;

-- Las tres funciones solo las ejecuta el servidor (service_role). anon y authenticated no.
revoke execute on function public.crear_invitacion(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.revocar_invitacion(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.unirse_con_codigo(text, uuid, text) from public, anon, authenticated;
grant execute on function public.crear_invitacion(uuid, uuid, text) to service_role;
grant execute on function public.revocar_invitacion(uuid, uuid) to service_role;
grant execute on function public.unirse_con_codigo(text, uuid, text) to service_role;
