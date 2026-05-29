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

  const functionName =
    window.siteConfig.functions
      .anonymizeMemberAccount;

  try {

    const { data, error } =
      await window.supabaseClient.functions.invoke(
        functionName,
        { body }
      );

    if (error) {

      let message =
        error.message
        || 'Account konnte nicht gelöscht werden.';

      if (error.context) {

        try {

          const payload =
            await error.context.json();

          if (payload?.error) {
            message = payload.error;
          }

        } catch (parseError) {

          console.warn(parseError);

        }

      }

      if (
        /failed to fetch|networkerror|load failed/i
          .test(message)
      ) {

        message =
          'Verbindung zur Server-Funktion fehlgeschlagen. '
          + 'Ist die Edge Function „'
          + functionName
          + '“ deployt?';

      }

      return {
        error: new Error(message)
      };

    }

    if (data?.error) {

      return {
        error: new Error(data.error)
      };

    }

    return {
      ok: true,
      data
    };

  } catch (error) {

    console.error(error);

    let message =
      error?.message
      || 'Account konnte nicht gelöscht werden.';

    if (
      /failed to fetch|networkerror|load failed/i
        .test(message)
    ) {

      message =
        'Verbindung zur Server-Funktion fehlgeschlagen. '
        + 'Ist die Edge Function „'
        + functionName
        + '“ deployt?';

    }

    return {
      error: new Error(message)
    };

  }

}
