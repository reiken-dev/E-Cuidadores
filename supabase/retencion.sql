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
