-- VIGENCIA POR FECHA DE FIN Y BÚSQUEDA POR CORREO (ECU-8).
-- Ejecútalo en el editor SQL de TU proyecto DESPUÉS de supabase/schema.sql, retencion.sql, permisos-service-role.sql,
-- datos-reales.sql, invitaciones.sql e invitaciones-ajustes.sql. Es idempotente: se puede ejecutar más de una vez.
-- ✅ Probado: `npm test` lo ejecuta en un PostgreSQL real en memoria (supabase/sql.test.ts).
--
-- 1) suscripcion_vigente ya no da acceso PERMANENTE a una suscripción activa o con cobro fallido: si Hotmart pierde o
--    retrasa el aviso de baja, el acceso vence solo. Regla (decisión del alumno):
--      · active / past_due: vigente hasta current_period_end + 7 días de gracia.
--      · Si Hotmart no manda la fecha de fin ([VERIFICAR] en lib/hotmart.ts), se usa una fecha de respaldo por plan:
--        última actualización + 31 días (mensual o desconocido) o 366 días (anual), y luego los 7 días de gracia.
--        Así nadie que pagó pierde el acceso solo porque falte el dato, y nadie queda con acceso permanente.
--      · trial: SIN CAMBIO (vigente sin fecha). Hoy ningún aviso del webhook asigna 'trial'; su vencimiento se define
--        cuando se confirme la prueba gratis con Hotmart.
--      · canceled: SIN CAMBIO (vigente solo hasta current_period_end, sin gracia: ya canceló).
--      · expired / refunded / chargeback: sin acceso (sin cambio).
-- 2) usuario_por_correo: el webhook encuentra al comprador de un solo golpe (índice único de auth.users.email) en vez
--    de recorrer todas las páginas de usuarios. Solo cuentas con el correo CONFIRMADO; solo service_role la ejecuta.

create or replace function public.suscripcion_vigente(u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = u
      and (
        s.status = 'trial'
        or (
          s.status in ('active', 'past_due')
          and coalesce(
                s.current_period_end,
                s.updated_at + case s.plan when 'anual' then interval '366 days' else interval '31 days' end
              ) + interval '7 days' > now()
        )
        or (s.status = 'canceled' and s.current_period_end > now())
      )
  );
$$;

-- INTERNA: la siguen usando user_subscribed y circle_active. El navegador no puede llamarla (ya estaba restringida;
-- se repite por seguridad porque la función se reemplazó).
revoke execute on function public.suscripcion_vigente(uuid) from public, anon, authenticated;

-- GoTrue guarda los correos en minúscula: comparar contra lower() aprovecha el índice único de auth.users.email.
create or replace function public.usuario_por_correo(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u
  where u.email = lower(btrim(p_email)) and u.email_confirmed_at is not null
  limit 1;
$$;
revoke execute on function public.usuario_por_correo(text) from public, anon, authenticated;
grant execute on function public.usuario_por_correo(text) to service_role;
