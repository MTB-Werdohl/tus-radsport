function isEdgeFunctionTransportError(
  message
) {

  return /failed to fetch|edge function|cors|networkerror|load failed|failed to send a request/i
    .test(String(message || ''));

}

function formatEdgeFunctionTransportError(
  functionName
) {

  return (
    'Server-Funktion nicht erreichbar. '
    + 'Edge Function „'
    + functionName
    + '“ muss unter genau diesem Slug deployt sein '
    + '(Verify JWT = AUS).'
  );

}

async function readFunctionInvokeError(
  error
) {

  if (!error?.context) {
    return null;
  }

  try {

    const context =
      error.context;

    if (
      typeof context === 'object'
      && !(context instanceof Response)
      && context.error
    ) {
      return context;
    }

    if (
      typeof context.json
      === 'function'
    ) {

      return await context.json();

    }

    if (
      typeof context.text
      === 'function'
    ) {

      const text =
        await context.text();

      if (!text) {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch (parseError) {

        return { error: text };

      }

    }

  } catch (readError) {

    console.warn(readError);

  }

  return null;

}

async function readFunctionFetchResult(
  response
) {

  let result = {};

  try {
    result = await response.json();
  } catch (parseError) {
    result = {};
  }

  if (!response.ok) {

    return {
      error: new Error(
        result.error
          || result.message
          || 'Account konnte nicht gelöscht werden.'
      )
    };

  }

  if (result?.error) {

    return {
      error: new Error(result.error)
    };

  }

  return {
    ok: true,
    data: result
  };

}

async function anonymizeMemberAccountViaFetch(
  functionName,
  session,
  body
) {

  const response =
    await fetch(
      getFunctionUrl(functionName),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            `Bearer ${session.access_token}`,
          apikey:
            window.siteConfig.supabaseAnonKey
        },
        body: JSON.stringify(body)
      }
    );

  return readFunctionFetchResult(response);

}

async function anonymizeMemberAccountViaInvoke(
  functionName,
  body
) {

  const { data, error } =
    await window.supabaseClient.functions.invoke(
      functionName,
      { body }
    );

  if (error) {

    let message =
      error.message
      || 'Account konnte nicht gelöscht werden.';

    const payload =
      await readFunctionInvokeError(
        error
      );

    if (payload?.error) {
      message = payload.error;
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

}

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

    let result =
      await anonymizeMemberAccountViaInvoke(
        functionName,
        body
      );

    if (
      result?.error
      && isEdgeFunctionTransportError(
        result.error.message
      )
    ) {

      result =
        await anonymizeMemberAccountViaFetch(
          functionName,
          session,
          body
        );

    }

    if (result?.error) {

      if (
        isEdgeFunctionTransportError(
          result.error.message
        )
      ) {

        return {
          error: new Error(
            formatEdgeFunctionTransportError(
              functionName
            )
          )
        };

      }

      return result;

    }

    return result;

  } catch (error) {

    console.error(error);

    if (
      isEdgeFunctionTransportError(
        error?.message
      )
    ) {

      try {

        const fallbackResult =
          await anonymizeMemberAccountViaFetch(
            functionName,
            session,
            body
          );

        if (fallbackResult?.error) {

          if (
            isEdgeFunctionTransportError(
              fallbackResult.error.message
            )
          ) {

            return {
              error: new Error(
                formatEdgeFunctionTransportError(
                  functionName
                )
              )
            };

          }

          return fallbackResult;

        }

        return fallbackResult;

      } catch (fallbackError) {

        console.error(fallbackError);

      }

    }

    return {
      error: new Error(
        error?.message
          || 'Account konnte nicht gelöscht werden.'
      )
    };

  }

}
