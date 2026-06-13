-- Diagnose: leere Storage-Objekte (0 Bytes) im Bucket media
-- Nach SQL-Backfill können unter shared/ Hüllen liegen, während shared/images/…
-- die echte Datei enthält — die Website verlinkte fälschlich zuerst auf shared/…
--
-- Nur im Supabase SQL Editor ausführen (Vorstand). Löschen erst nach Prüfung!

-- 1) Alle leeren Dateien (ohne Supabase-Ordner-Platzhalter)
select
  o.name,
  coalesce(
    (o.metadata ->> 'size')::bigint,
    0
  ) as size_bytes,
  o.created_at,
  o.updated_at
from storage.objects o
where o.bucket_id = 'media'
  and o.name not like '%.emptyFolderPlaceholder'
  and coalesce(
    (o.metadata ->> 'size')::bigint,
    0
  ) = 0
order by o.name;

-- 2) Verdächtige Duplikate: leere Hülle in shared/ + volle Datei in shared/images/…
select
  shell.name as empty_shell,
  filled.name as full_file,
  coalesce(
    (filled.metadata ->> 'size')::bigint,
    0
  ) as full_size_bytes
from storage.objects shell
join storage.objects filled
  on filled.bucket_id = shell.bucket_id
 and filled.name like 'shared/images/%'
 and split_part(filled.name, '/', 3)
   = split_part(shell.name, '/', 2)
where shell.bucket_id = 'media'
  and shell.name like 'shared/%'
  and shell.name not like 'shared/%/%'
  and coalesce(
    (shell.metadata ->> 'size')::bigint,
    0
  ) = 0
  and coalesce(
    (filled.metadata ->> 'size')::bigint,
    0
  ) > 0
order by shell.name;

-- 3) Optional: leere Hüllen löschen (nur wenn Zeile 2 Treffer zeigt!)
-- Im Admin alternativ: Medien-Explorer → Datei → Löschen
-- oder Storage API remove() — nicht per DELETE FROM storage.objects!
--
-- Beispiel (einzeln prüfen):
-- select storage.delete_object('media', 'shared/1234567890-bild.png');
