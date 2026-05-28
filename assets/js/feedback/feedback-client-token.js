const FEEDBACK_TOKEN_PREFIX =
  'feedbackClientToken_';

const FEEDBACK_ANSWER_PREFIX =
  'feedbackClientAnswer_';

function getFeedbackClientToken(moduleId) {

  const key =
    FEEDBACK_TOKEN_PREFIX
    + moduleId;

  let token =
    localStorage.getItem(key);

  if (!token) {

    token =
      crypto.randomUUID();

    localStorage.setItem(
      key,
      token
    );

  }

  return token;

}

function getFeedbackClientAnswerCache(moduleId) {

  const raw =
    localStorage.getItem(
      FEEDBACK_ANSWER_PREFIX
      + moduleId
    );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }

}

function setFeedbackClientAnswerCache(
  moduleId,
  answer,
  comment
) {

  localStorage.setItem(
    FEEDBACK_ANSWER_PREFIX
    + moduleId,
    JSON.stringify({
      answer,
      comment: comment || null
    })
  );

}
