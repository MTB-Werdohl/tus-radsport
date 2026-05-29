async function anonymizeMemberAccount(
  options
) {

  const { data: { session } } =
    await window.supabaseClient.auth.getSession();

  if (!session?.access_token) {

    return {
      error: new Error(
        'Nicht angemeldet.'
      )
    };

  }

  const body = {};

  if (
    options?.memberId !== null
    && options?.memberId !== undefined
  ) {
    body.member_id = options.memberId;
  }

  const response =
    await fetch(
      getFunctionUrl(
        'anonymizeMemberAccount'
      ),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      }
    );

  let result = {};

  try {
    result = await response.json();
  } catch (error) {
    result = {};
  }

  if (!response.ok) {

    return {
      error: new Error(
        result.error
          || 'Account konnte nicht gelöscht werden.'
      )
    };

  }

  return {
    ok: true,
    data: result
  };

}
