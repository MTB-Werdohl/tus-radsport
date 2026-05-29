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

async function saveFeedbackAnswer(
  moduleId,
  identity,
  answer,
  comment
) {

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

async function submitPublicFeedbackAnswer(
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

    return { error };

  }

  return { status: data };

}

async function submitPublicFeedbackAnswer(
  moduleId,
  registration,
  answer,
  comment
) {

  const { data, error } =
    await window.supabaseClient.rpc(
      'submit_public_feedback',
      {
        p_module_id: moduleId,
        p_email: registration.email,
        p_vorname: registration.vorname,
        p_nachname: registration.nachname,
        p_telefon: registration.telefon || null,
        p_answer: answer,
        p_comment:
          comment
            ? String(comment).trim()
            : null
      }
    );

  if (error) {

    console.error(error);

    return { error };

  }

  setPublicFeedbackEmail(
    registration.email
  );

  return { data };

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
        member_id,
        members (
          vorname,
          nachname,
          email,
          rolle
        )
      `)
      .eq('module_id', moduleId)
      .order('updated_at', { ascending: false });

  if (error) {

    console.error(error);

    return [];

  }

  return data || [];

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
        .select('title, slug')
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
        .select('id, title, slug')
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
