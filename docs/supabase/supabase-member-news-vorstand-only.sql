-- Internes (News): nur noch Vorstand darf schreiben.
-- Mitglieder behalten Termin-Entw├╝rfe (termine_*_member_draft).
-- Idempotent ÔÇö sicher mehrfach ausf├╝hrbar.

drop policy if exists news_insert_member_draft on "News";
drop policy if exists news_update_member_draft on "News";
drop policy if exists news_delete_member_draft on "News";
