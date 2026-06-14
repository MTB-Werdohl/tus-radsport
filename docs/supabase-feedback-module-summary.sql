-- Aggregierte Feedback-Auswertung für Mitglieder (ohne Einzelantworten)
-- Nach supabase-feedback.sql und member_can_view_sichtbarkeit (supabase-member-change-summary.sql)

create or replace function public.get_feedback_module_summary(
  p_module_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_module public.feedback_modules%rowtype;
  v_sichtbarkeit text;
  v_total integer := 0;
  v_selection_total integer := 0;
  v_counts jsonb := '{}'::jsonb;
  v_row record;
  v_key text;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_module
  from public.feedback_modules fm
  where fm.id = p_module_id
    and fm.enabled = true;

  if not found then
    return null;
  end if;

  if v_module.entity_type = 'news' then

    select n.sichtbarkeit
    into v_sichtbarkeit
    from public."News" n
    where n.id = v_module.entity_id;

    if not found then
      return null;
    end if;

  elsif v_module.entity_type = 'event' then

    select t.sichtbarkeit
    into v_sichtbarkeit
    from public."Termine" t
    where t.id = v_module.entity_id;

    if not found then
      return null;
    end if;

  else
    return null;
  end if;

  if not public.member_can_view_sichtbarkeit(v_sichtbarkeit) then
    raise exception 'Keine Berechtigung für diese Auswertung';
  end if;

  select count(*)::integer
  into v_total
  from public.feedback_answers fa
  where fa.module_id = p_module_id;

  if v_module.type = 'poll' then

    for v_row in
      select fa.answer
      from public.feedback_answers fa
      where fa.module_id = p_module_id
    loop

      if v_row.answer is null then
        continue;
      end if;

      for v_key in
        select trim(both '"' from value::text)
        from jsonb_array_elements_text(
          case
            when trim(v_row.answer) = '[]' then
              '[]'::jsonb
            when left(trim(v_row.answer), 1) = '[' then
              v_row.answer::jsonb
            else
              jsonb_build_array(v_row.answer)
          end
        ) as value
      loop

        if v_key is null or v_key = '' then
          continue;
        end if;

        v_counts :=
          jsonb_set(
            v_counts,
            array[v_key],
            to_jsonb(
              coalesce((v_counts ->> v_key)::integer, 0)
              + 1
            ),
            true
          );

      end loop;

    end loop;

    select coalesce(
      sum(value::integer),
      0
    )
    into v_selection_total
    from jsonb_each_text(v_counts) as entry(
      key,
      value
    );

  else

    for v_row in
      select
        fa.answer as answer_key,
        count(*)::integer as cnt
      from public.feedback_answers fa
      where fa.module_id = p_module_id
      group by fa.answer
    loop

      if v_row.answer_key is null then
        continue;
      end if;

      v_counts :=
        jsonb_set(
          v_counts,
          array[v_row.answer_key],
          to_jsonb(v_row.cnt),
          true
        );

    end loop;

    v_selection_total := v_total;

  end if;

  return jsonb_build_object(
    'total', v_total,
    'selection_total', v_selection_total,
    'counts', v_counts
  );

end;
$$;

comment on function public.get_feedback_module_summary(bigint) is
  'Aggregierte Antwortzahlen pro Feedback-Modul; nur wenn Entity-Sichtbarkeit erlaubt.';

revoke all on function public.get_feedback_module_summary(bigint) from public;

grant execute on function public.get_feedback_module_summary(bigint)
  to authenticated;
