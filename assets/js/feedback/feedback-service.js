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

  const clientToken =
    identity?.clientToken
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

  if (memberId) {
    payload.member_id = memberId;
  }

  if (clientToken) {
    payload.client_token = clientToken;
  }

  const onConflict =
    memberId
      ? 'module_id,member_id'
      : 'module_id,client_token';

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackAnswers
      )
      .upsert(
        payload,
        { onConflict }
      )
      .select('*')
      .single();

  if (error) {

    console.error(error);

    return { error };

  }

  return { data };

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
      .order('created_at', { ascending: false });

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
          email
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

async function fetchFeedbackEntityTitle(
  entityType,
  entityId
) {

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.event
  ) {

    const { data } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .select('title, slug')
        .eq('id', entityId)
        .maybeSingle();

    return data;

  }

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.news
  ) {

    const { data } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .select('title, slug')
        .eq('id', entityId)
        .maybeSingle();

    return data;

  }

  return null;

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
