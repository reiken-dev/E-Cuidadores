-- DATOS REALES — lo que falta para guardar en Supabase lo que hoy vive en el navegador (ECU-5).
-- Ejecútalo en el editor SQL de TU proyecto DESPUÉS de supabase/schema.sql, supabase/retencion.sql y
-- supabase/permisos-service-role.sql. Es idempotente: se puede ejecutar más de una vez.
-- ✅ Probado: `npm test` lo ejecuta en un PostgreSQL real en memoria (supabase/sql.test.ts).

-- 1) Columnas nuevas
alter table public.meds
  add column if not exists schedule_from timestamptz;   -- desde cuándo rige el horario ACTUAL (lo anterior queda como historial)
alter table public.circles
  add column if not exists questions text not null default '' check (char_length(questions) <= 2000);  -- preguntas para el médico
alter table public.circles
  add column if not exists allergies_at date;           -- día en que se registró o cambió la lista de alergias

-- 2) Lo único que el navegador puede actualizar de lo nuevo (el resto sigue cerrado)
grant update (questions, allergies_at, celebrated_milestones) on public.circles to authenticated;
grant update (last_seen_at) on public.members to authenticated;
drop policy if exists "marcar mi visita" on public.members;
create policy "marcar mi visita" on public.members for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 3) Registrar una dosis en UNA transacción: borra la anterior y guarda la nueva ("la última gana").
--    security invoker: las políticas RLS siguen aplicando a quien llama (miembro, círculo al día).
--    El trigger dose_logs_atribuir fija given_by y given_by_name con la sesión: nadie firma a nombre de otro.
create or replace function public.registrar_dosis(
  c uuid, m uuid, d date, t text, skipped text, by_self boolean
)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.dose_logs
   where circle_id = c and med_id = m and dose_date = d and dose_time = t;
  insert into public.dose_logs (circle_id, med_id, dose_date, dose_time, skipped_reason, given_by_self, given_by, given_by_name)
  values (c, m, d, t, skipped, coalesce(by_self, false), (select auth.uid()), '-');
end;
$$;
revoke execute on function public.registrar_dosis(uuid, uuid, date, text, text, boolean) from public, anon;
grant execute on function public.registrar_dosis(uuid, uuid, date, text, text, boolean) to authenticated;
