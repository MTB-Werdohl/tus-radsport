-- Eigene Feedback-Antwort zurückziehen (Datensatz löschen)
-- Nach supabase-feedback.sql ausführen

drop policy if exists feedback_answers_delete_own on public.feedback_answers;

create policy feedback_answers_delete_own
  on public.feedback_answers
  for delete
  to authenticated
  using (
    member_id in (
      select m.id
      from public.members m
      where lower(trim(m.email)) = lower(trim(auth.jwt()->>'email'))
    )
  );
