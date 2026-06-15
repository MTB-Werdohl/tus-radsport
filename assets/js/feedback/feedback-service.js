async function fetchFeedbackModule(
  entityType,
  entityId
) {

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackModules
      )
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  return data;

}

async function fetchOwnFeedbackAnswer(
  moduleId,
  memberId
) {

  if (!moduleId || !memberId) {
    return null;
  }

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackAnswers
      )
      .select('*')
      .eq('module_id', moduleId)
      .eq('member_id', memberId)
      .maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  return data;

}

async function setEventFeedbackAnswer(
  moduleId,
  answer,
  comment,
  cancellationReasonCode
) {

  const { data, error } =
    await window.supabaseClient.rpc(
      'set_event_feedback_answer',
      {
        p_module_id: moduleId,
        p_answer: answer ?? null,
        p_comment: comment ?? null,
        p_cancellation_reason_code:
          cancellationReasonCode ?? null
      }
    );

  if (error) {

    console.error(error);

    return { error };

  }

  const answerRow =
    data?.answer ?? null;

  return {
    data: answerRow
  };

}

async function listFeedbackParticipationChanges(
  options = {}
) {

  const { data, error } =
    await window.supabaseClient.rpc(
      'list_feedback_participation_changes',
      {
        p_module_id:
          options.moduleId ?? null,
        p_limit:
          options.limit ?? 50,
        p_offset:
          options.offset ?? 0
      }
    );

  if (error) {

    console.error(error);

    return { error, rows: [] };

  }

  return {
    rows: Array.isArray(data) ? data : []
  };

}

async function saveFeedbackAnswer(
  moduleId,
  identity,
  answer,
  comment,
  options = {}
) {

  if (options.eventCommitment === true) {

    return setEventFeedbackAnswer(
      moduleId,
      answer,
      comment,
      options.cancellationReasonCode
    );

  }

  const memberId =
    identity?.memberId
    || null;

  const payload = {
    module_id: moduleId,
    answer,
    comment:
      comment
        ? String(comment).trim()
        : null,
    updated_at:
      new Date().toISOString()
  };

  if (!memberId) {
    return {
      error: new Error(
        'Kein Mitglied für die Abstimmung.'
      )
    };
  }

  payload.member_id = memberId;

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackAnswers
      )
      .upsert(
        payload,
        { onConflict: 'module_id,member_id' }
      )
      .select('*')
      .single();

  if (error) {

    console.error(error);

    return { error };

  }

  return { data };

}

async function deleteFeedbackAnswer(
  moduleId,
  memberId,
  options = {}
) {

  if (options.eventCommitment === true) {

    return setEventFeedbackAnswer(
      moduleId,
      null,
      options.comment ?? null,
      options.cancellationReasonCode
    );

  }

  if (!moduleId || !memberId) {
    return { ok: true };
  }

  const { error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackAnswers
      )
      .delete()
      .eq('module_id', moduleId)
      .eq('member_id', memberId);

  if (error) {

    console.error(error);

    return { error };

  }

  return { ok: true };

}

async function canRegisterPublicParticipant(
  email
) {

  const { data, error } =
    await window.supabaseClient.rpc(
      'can_register_public_participant',
      {
        p_email: email
      }
    );

  if (error) {

    console.error(error);

    const message =
      String(error.message || '');

    if (
      message.includes(
        'Could not find the function'
      )
      || error.code === 'PGRST202'
    ) {

      return {
        error: new Error(
          'Registrierung ist serverseitig noch nicht eingerichtet. '
          + 'Im Supabase SQL Editor docs/supabase-feedback-public-email-verify.sql ausführen.'
        )
      };

    }

    return { error };

  }

  return { status: data };

}

async function fetchPublicFeedbackAnswerByEmail(
  moduleId,
  email
) {

  if (!moduleId || !email) {
    return null;
  }

  const { data, error } =
    await window.supabaseClient.rpc(
      'get_public_feedback_answer',
      {
        p_module_id: moduleId,
        p_email: email.trim().toLowerCase()
      }
    );

  if (error) {

    console.error(error);

    return null;

  }

  if (!data || data.answer == null) {
    return null;
  }

  return {
    answer: data.answer,
    comment: data.comment || null
  };

}

async function saveFeedbackModule(payload) {

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackModules
      )
      .upsert(
        payload,
        { onConflict: 'entity_type,entity_id' }
      )
      .select('*')
      .single();

  if (error) {

    console.error(error);

    return { error };

  }

  return { data };

}

async function deleteFeedbackModule(moduleId) {

  const { error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackModules
      )
      .delete()
      .eq('id', moduleId);

  if (error) {

    console.error(error);

    return { error };

  }

  return { ok: true };

}

async function deleteFeedbackForEntity(
  entityType,
  entityId
) {

  const id =
    normalizeFeedbackEntityId(entityId);

  if (!entityType || !id) {
    return { ok: true };
  }

  const { error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackModules
      )
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', id);

  if (error) {

    console.error(error);

    return { error };

  }

  return { ok: true };

}

async function fetchFeedbackModuleById(moduleId) {

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackModules
      )
      .select('*')
      .eq('id', moduleId)
      .maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  return data;

}

async function fetchAllFeedbackModules() {

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackModules
      )
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

  if (error) {

    console.error(error);

    return [];

  }

  return data || [];

}

async function fetchFeedbackAnswersForModule(
  moduleId
) {

  const baseSelect = `
        id,
        answer,
        comment,
        created_at,
        updated_at,
        member_id,
        members (
          id,
          vorname,
          nachname,
          email,
          rolle,
          anonymized_at,
          einwilligung_kontakt,
          telefonnummer
        )
      `;

  const avatarSelect = `
        id,
        answer,
        comment,
        created_at,
        updated_at,
        member_id,
        members (
          id,
          vorname,
          nachname,
          email,
          rolle,
          anonymized_at,
          einwilligung_kontakt,
          avatar_storage_path,
          avatar_updated_at,
          telefonnummer
        )
      `;

  let { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackAnswers
      )
      .select(avatarSelect)
      .eq('module_id', moduleId)
      .order('updated_at', { ascending: false });

  if (
    error
    && /avatar_/i.test(
      String(error.message || '')
    )
  ) {

    ({ data, error } =
      await window.supabaseClient
        .from(
          window.siteConfig.tables.feedbackAnswers
        )
        .select(baseSelect)
        .eq('module_id', moduleId)
        .order('updated_at', { ascending: false }));

  }

  if (error) {

    console.error(error);

    return [];

  }

  return data || [];

}

async function fetchMemberFeedbackAnswers(
  memberId
) {

  if (!memberId) {
    return [];
  }

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackAnswers
      )
      .select(`
        id,
        answer,
        comment,
        created_at,
        updated_at,
        module_id,
        feedback_modules (
          id,
          type,
          entity_type,
          entity_id,
          question,
          config
        )
      `)
      .eq('member_id', memberId)
      .order(
        'updated_at',
        { ascending: false }
      );

  if (error) {

    console.error(error);

    throw error;

  }

  return data || [];

}

async function fetchFeedbackEntityRecordsForModules(
  modules
) {

  const map =
    new Map();

  const eventIds =
    [
      ...new Set(
        (modules || [])
          .filter((module) =>
            module.entity_type
            === window.siteConfig.feedback.entityTypes.event
          )
          .map((module) =>
            normalizeFeedbackEntityId(
              module.entity_id
            )
          )
          .filter(Boolean)
      )
    ];

  const newsIds =
    [
      ...new Set(
        (modules || [])
          .filter((module) =>
            module.entity_type
            === window.siteConfig.feedback.entityTypes.news
          )
          .map((module) =>
            normalizeFeedbackEntityId(
              module.entity_id
            )
          )
          .filter(Boolean)
      )
    ];

  if (eventIds.length) {

    const { data, error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .select(`
          id,
          title,
          slug,
          date,
          endDate,
          durationDays,
          recurring,
          daysOfWeek,
          startRecur,
          endRecur,
          exclude,
          location,
          startTime,
          sichtbarkeit
        `)
        .in('id', eventIds);

    if (error) {
      console.error(error);
    } else {
      (data || []).forEach((row) => {
        map.set(
          getFeedbackEntityMapKey(
            window.siteConfig.feedback.entityTypes.event,
            row.id
          ),
          row
        );
      });
    }

  }

  if (newsIds.length) {

    const { data, error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .select(
          'id, title, slug, sichtbarkeit'
        )
        .in('id', newsIds);

    if (error) {
      console.error(error);
    } else {
      (data || []).forEach((row) => {
        map.set(
          getFeedbackEntityMapKey(
            window.siteConfig.feedback.entityTypes.news,
            row.id
          ),
          row
        );
      });
    }

  }

  return map;

}

function getFeedbackEntityRecordFromMap(
  entityMap,
  module
) {

  const key =
    getFeedbackEntityMapKey(
      module.entity_type,
      module.entity_id
    );

  if (!key) {
    return null;
  }

  return entityMap.get(key) || null;

}

function normalizeFeedbackEntityId(entityId) {

  const value =
    parseInt(entityId, 10);

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;

}

function getFeedbackEntityMapKey(
  entityType,
  entityId
) {

  const id =
    normalizeFeedbackEntityId(entityId);

  if (!id) {
    return null;
  }

  return `${entityType}:${id}`;

}

async function fetchFeedbackEntityTitle(
  entityType,
  entityId
) {

  const id =
    normalizeFeedbackEntityId(entityId);

  if (!id) {
    return null;
  }

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.event
  ) {

    const { data, error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .select('title, slug, recurring')
        .eq('id', id)
        .maybeSingle();

    if (error) {
      console.error(error);
      return null;
    }

    return data;

  }

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.news
  ) {

    const { data, error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .select('title, slug')
        .eq('id', id)
        .maybeSingle();

    if (error) {
      console.error(error);
      return null;
    }

    return data;

  }

  return null;

}

async function fetchFeedbackEntityTitlesForModules(
  modules
) {

  const map =
    new Map();

  const eventIds =
    [
      ...new Set(
        (modules || [])
          .filter((module) =>
            module.entity_type
            === window.siteConfig.feedback.entityTypes.event
          )
          .map((module) =>
            normalizeFeedbackEntityId(
              module.entity_id
            )
          )
          .filter(Boolean)
      )
    ];

  const newsIds =
    [
      ...new Set(
        (modules || [])
          .filter((module) =>
            module.entity_type
            === window.siteConfig.feedback.entityTypes.news
          )
          .map((module) =>
            normalizeFeedbackEntityId(
              module.entity_id
            )
          )
          .filter(Boolean)
      )
    ];

  if (eventIds.length) {

    const { data, error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .select('id, title, slug, recurring')
        .in('id', eventIds);

    if (error) {
      console.error(error);
    } else {
      (data || []).forEach((row) => {
        map.set(
          getFeedbackEntityMapKey(
            window.siteConfig.feedback.entityTypes.event,
            row.id
          ),
          row
        );
      });
    }

  }

  if (newsIds.length) {

    const { data, error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .select('id, title, slug')
        .in('id', newsIds);

    if (error) {
      console.error(error);
    } else {
      (data || []).forEach((row) => {
        map.set(
          getFeedbackEntityMapKey(
            window.siteConfig.feedback.entityTypes.news,
            row.id
          ),
          row
        );
      });
    }

  }

  return map;

}

function getFeedbackEntityFromMap(
  entityMap,
  module
) {

  const key =
    getFeedbackEntityMapKey(
      module.entity_type,
      module.entity_id
    );

  if (!key) {
    return null;
  }

  return entityMap.get(key) || null;

}

async function countFeedbackAnswers(moduleId) {

  const { count, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackAnswers
      )
      .select('*', {
        count: 'exact',
        head: true
      })
      .eq('module_id', moduleId);

  if (error) {

    console.error(error);

    return 0;

  }

  return count || 0;

}

async function fetchFeedbackModuleSummary(
  moduleId
) {

  if (!moduleId) {
    return null;
  }

  const { data, error } =
    await window.supabaseClient.rpc(
      'get_feedback_module_summary',
      {
        p_module_id: moduleId
      }
    );

  if (error) {

    const message =
      String(error.message || '');

    if (
      message.includes('Could not find the function')
      || error.code === 'PGRST202'
    ) {

      console.warn(
        'get_feedback_module_summary fehlt — '
        + 'docs/supabase-feedback-module-summary.sql ausführen.'
      );

      return null;

    }

    console.error(error);

    return null;

  }

  if (!data) {
    return null;
  }

  return {
    total:
      Number(data.total) || 0,
    selectionTotal:
      Number(data.selection_total)
      || getFeedbackPollSelectionTotal(
        data.counts || {}
      ),
    counts:
      data.counts || {}
  };

}

function isGuestInternalEmail(email) {

  return /^guest\+.+\@walkin\.internal\.mtb-werdohl\.de$/i
    .test(
      String(email || '').trim()
    );

}

function isGuestMember(member) {

  return (
    String(member?.rolle || '')
      .trim()
      .toLowerCase()
    === 'guest'
  );

}

async function fetchClubMembersForParticipantPicker() {

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.members
      )
      .select(
        'id,vorname,nachname,email,rolle,anonymized_at'
      )
      .is('anonymized_at', null)
      .order('nachname', {
        ascending: true
      });

  if (error) {

    console.error(error);

    return [];

  }

  return (data || [])
    .filter((member) => {

      const rolle =
        String(member.rolle || '')
          .trim()
          .toLowerCase();

      return (
        rolle === 'mitglied'
        || rolle === 'vorstand'
      );

    });

}

async function adminManageEventParticipant(
  params
) {

  const payload = {
    p_module_id: params.moduleId,
    p_action: params.action,
    p_member_id:
      params.memberId ?? null,
    p_answer:
      params.answer ?? null,
    p_vorname:
      params.vorname ?? null,
    p_nachname:
      params.nachname ?? null,
    p_telefon:
      params.telefon ?? null,
    p_email:
      params.email ?? null,
    p_admin_note:
      params.adminNote ?? null
  };

  const { data, error } =
    await window.supabaseClient.rpc(
      'admin_manage_event_participant',
      payload
    );

  if (error) {

    console.error(error);

    return { error };

  }

  return { data };

}

function normalizeRpcJsonArray(data) {

  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === 'string') {

    try {

      const parsed =
        JSON.parse(data);

      return Array.isArray(parsed)
        ? parsed
        : [];

    } catch (error) {

      return [];

    }

  }

  return [];

}

function canLoadGuestWalkInDrafts() {

  const member =
    typeof getCurrentMember === 'function'
      ? getCurrentMember()
      : null;

  if (
    typeof isRealVorstand === 'function'
    && isRealVorstand(member)
  ) {
    return true;
  }

  if (
    typeof isVorstand === 'function'
    && isVorstand(member)
  ) {
    return true;
  }

  return false;

}

async function fetchGuestWalkInDrafts() {

  if (
    typeof fetchGuestWalkInContentDrafts
      === 'function'
  ) {
    return fetchGuestWalkInContentDrafts();
  }

  return fetchGuestWalkInDraftsViaRpc();

}

async function fetchGuestWalkInDraftsViaRpc() {

  const { data, error } =
    await window.supabaseClient.rpc(
      'list_guest_walkin_drafts'
    );

  if (error) {

    console.error(
      'list_guest_walkin_drafts:',
      error
    );

    return [];

  }

  const rows =
    Array.isArray(data)
      ? data
      : (data ? [data] : []);

  return rows
    .map(mapGuestWalkInDraftRow)
    .filter(Boolean);

}

function mapGuestWalkInDraftRow(row) {

  const memberId =
    row?.member_id
    || row?.id;

  if (!memberId) {
    return null;
  }

  const guestLabel =
    [
      row.vorname,
      row.nachname
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
    || 'Walk-in Gast';

  const terminTitle =
    row.termin_title || 'Termin';

  return {
    type: 'walkin',
    id: memberId,
    memberId,
    moduleId: row.module_id || null,
    terminId: row.termin_id || null,
    title:
      `${guestLabel} · ${terminTitle}`,
    sortAt:
      row.sort_at || null
  };

}
