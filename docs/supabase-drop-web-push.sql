-- Web Push entfernen: Tabellen löschen, Tröte bleibt in site_state.last_push
-- Nach Deploy des Frontend-Updates im Supabase SQL Editor ausführen.
--
-- Edge Functions send-push, save-push-subscription, delete-push-subscription
-- können im Supabase Dashboard gelöscht werden (optional).

drop policy if exists push_subscriptions_select_own on public."PushSubscriptions";
drop policy if exists push_subscriptions_admin_select on public."PushSubscriptions";
drop policy if exists push_subscriptions_delete_vorstand on public."PushSubscriptions";
drop policy if exists "PushSubscriptions Admin Select" on public."PushSubscriptions";
drop policy if exists "PushSubscriptions Public Insert" on public."PushSubscriptions";
drop policy if exists "PushSubscriptions Public Delete" on public."PushSubscriptions";

drop policy if exists push_messages_select_public on public."PushMessages";
drop policy if exists push_messages_insert_vorstand on public."PushMessages";

drop table if exists public."PushMessages" cascade;
drop table if exists public."PushSubscriptions" cascade;

-- site_state.key = 'last_push' bleibt unverändert (öffentlich lesbar, Vorstand schreibt).
