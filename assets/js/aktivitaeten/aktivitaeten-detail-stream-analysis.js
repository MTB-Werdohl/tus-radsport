async function loadActivityDetailStreamAnalysis(
  activityId,
  container
) {

  if (
    !activityId
    || !container
  ) {
    return;
  }

  try {

    const payload =
      await fetchPublicActivityStreams(
        activityId
      );

    if (
      !container.isConnected
    ) {
      return;
    }

    if (!payload) {

      console.warn(
        '[streams] no public stream data',
        { activityId }
      );

      return;

    }

    const validation =
      validateStreamPayloadClient(payload);

    if (!validation.ok) {

      console.warn(
        '[streams] invalid payload',
        {
          activityId,
          reason: validation.reason
        }
      );

      return;

    }

    const blocks =
      runStreamAnalysisBlocks(payload);

    if (!blocks.length) {

      console.warn(
        '[streams] no stream analysis blocks',
        { activityId }
      );

      return;

    }

    mountStreamAnalysisSection(
      container,
      blocks
    );

  } catch (error) {

    console.error(
      '[streams] fetch failed',
      { activityId, error }
    );

  }

}
