-- PERMISOS DE service_role — el webhook de Hotmart y el cron de retención corren con la clave de servicio (rol service_role).
-- Ejecútalo en el editor SQL de TU proyecto, DESPUÉS de supabase/schema.sql y supabase/retencion.sql.
--
-- ¿Cuándo hace falta? Si al crear el proyecto desmarcaste "Automatically expose new tables" (lo recomendado por Supabase),
-- Supabase ya no concede privilegios por defecto a ningún rol de la API, tampoco a service_role. Sin este archivo, el
-- webhook y el cron fallan con «permission denied for table …» (error 42501) aunque la clave sea correcta.
-- Si dejaste esa opción marcada, no hace falta, pero es inofensivo: es idempotente y se puede ejecutar de todos modos.
--
-- Solo concede a service_role, que además ya salta RLS. Los privilegios de anon y authenticated NO cambian:
-- seguirán sin poder leer ni escribir pagos, suscripciones ajenas, compras pendientes ni el libro de ingresos.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Lo que se cree después en public (nuevas tablas, secuencias o funciones) también queda disponible para service_role.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
