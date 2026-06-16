-- Entfernt Termin-Rückblicke / Erlebtes vollständig aus der Datenbank.
-- Nach Anwendung: optional Dateien unter media/recaps/ im Bucket manuell löschen.
-- Idempotent — sicher mehrfach ausführbar.

-- ---------------------------------------------------------------------------
-- Storage-Policies (recaps/)
-- ---------------------------------------------------------------------------

drop policy if exists media_insert_club_member_recaps on storage.objects;
drop policy if exists media_update_club_member_recaps on storage.objects;
drop policy if exists media_delete_club_member_recaps on storage.objects;

-- ---------------------------------------------------------------------------
-- Tabellen (entfernt zuerst abhängige RLS-Policies und Trigger)
-- ---------------------------------------------------------------------------

drop table if exists public.termin_recap_images cascade;
drop table if exists public.termin_recaps cascade;

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

drop function if exists public.can_select_termin_recap(public.termin_recaps);
drop function if exists public.set_recap_created_by();
drop function if exists public.touch_termin_recap();
drop function if exists public.recap_member_owns_termin(bigint);
drop function if exists public.termin_allows_recap(public."Termine");
drop function if exists public.recap_storage_termin_id(text);
drop function if exists public.recap_storage_folder_key(text);
