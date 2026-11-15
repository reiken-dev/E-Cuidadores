-- AJUSTES DE INVITACIONES — cierra dos huecos que encontró la revisión de ECU-9. Archivo nuevo: invitaciones.sql no se toca.
-- Ejecútalo en el editor SQL de TU proyecto DESPUÉS de supabase/invitaciones.sql. Es idempotente.
-- ✅ Probado: `npm test` lo ejecuta en un PostgreSQL real en memoria (supabase/sql.test.ts).
--
-- 1) Una persona nunca queda en dos círculos aunque llame a unirse con dos códigos a la vez: la función toma un
--    candado por usuario antes de comprobar si ya pertenece a uno.
-- 2) Con la suscripción del organizador vencida, el círculo es de solo lectura: ya no se admite a nadie nuevo
--    ('inactivo') ni se crean enlaces nuevos. Quien ya es miembro sigue recibiendo 'ok'.

create or replace function public.crear_invitacion(p_circle uuid, p_user uuid, p_code text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  vence timestamptz := now() + interval '7 days';
begin
  perform 1 from public.circles where id = p_circle and created_by = p_user for update;
  if not found then return null; end if;
  -- Sin suscripción vigente el círculo es de solo lectura: no tiene sentido invitar.
  if not public.suscripcion_vigente(p_user) then return null; end if;
  update public.invitations set revoked_at = now()
    where circle_id = p_circle and revoked_at is null and expires_at > now();
  insert into public.invitations (circle_id, code, created_by, expires_at)
    values (p_circle, p_code, p_user, vence);
  return vence;
end; $$;

-- Devuelve 'ok', 'invalida', 'lleno', 'ya_en_circulo' o 'inactivo' (el organizador no tiene la suscripción vigente).
create or replace function public.unirse_con_codigo(p_code text, p_user uuid, p_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  circulo uuid;
  organizador uuid;
  cuantos int;
  nombre text := btrim(coalesce(p_name, ''));
begin
  if char_length(nombre) not between 1 and 80 then return 'invalida'; end if;
  select i.circle_id into circulo from public.invitations i
    where i.code = p_code and i.revoked_at is null and i.expires_at > now();
  if circulo is null then return 'invalida'; end if;
  -- Candado por usuario: dos llamadas de la misma persona se hacen en fila, no a la vez.
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  -- Bloquea el círculo: dos personas entrando a la vez no pasan del tope.
  select ci.created_by into organizador from public.circles ci where ci.id = circulo for update;
  if not found then return 'invalida'; end if;
  if exists (select 1 from public.members where circle_id = circulo and user_id = p_user) then return 'ok'; end if;
  if exists (select 1 from public.members where user_id = p_user) then return 'ya_en_circulo'; end if;
  if organizador is null or not public.suscripcion_vigente(organizador) then return 'inactivo'; end if;
  select count(*) into cuantos from public.members where circle_id = circulo;
  if cuantos >= 12 then return 'lleno'; end if;
  insert into public.members (circle_id, user_id, name, role) values (circulo, p_user, nombre, 'Hermano/a');
  return 'ok';
end; $$;

-- Las funciones recreadas conservan el permiso solo para service_role.
revoke execute on function public.crear_invitacion(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.unirse_con_codigo(text, uuid, text) from public, anon, authenticated;
grant execute on function public.crear_invitacion(uuid, uuid, text) to service_role;
grant execute on function public.unirse_con_codigo(text, uuid, text) to service_role;
