function openMemberConsentModal(key) {

  const modal =
    document.getElementById(
      `member-consent-dialog-${key}`
    );

  if (!modal) {
    return;
  }

  modal.hidden = false;

  document.body.classList.add(
    'member-consent-modal-open'
  );

  const closeBtn =
    modal.querySelector(
      '.member-consent-dialog__close'
    );

  if (closeBtn) {
    closeBtn.focus();
  }

}

function closeMemberConsentModal(modal) {

  if (!modal) {
    return;
  }

  modal.hidden = true;

  document.body.classList.remove(
    'member-consent-modal-open'
  );

}

function showLoginCallbackNotice(member) {

  const section =
    document.querySelector(
      '.member-profile-section'
    );

  const heading =
    section?.querySelector('h1');

  if (
    !section
    || !heading
    || section.querySelector(
      '.member-login-callback-banner'
    )
  ) {
    return;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const fromCallback =
    sessionStorage.getItem(
      'memberLoginCallback'
    ) === '1'
    || params.has('next');

  if (!fromCallback) {
    return;
  }

  sessionStorage.removeItem(
    'memberLoginCallback'
  );

  const nextUrl =
    params.get('next')
    || sessionStorage.getItem('adminReturnUrl');

  const adminLink =
    nextUrl
    && nextUrl.startsWith('/admin')
    && typeof isVorstand === 'function'
    && isVorstand(member)
      ? `
        <p>
          <a
            href="${nextUrl}"
            class="member-login-callback-admin">

            Zum Admin-Bereich

          </a>
        </p>
      `
      : (
        typeof isVorstand === 'function'
        && isVorstand(member)
          ? `
            <p>
              <a
                href="/admin/"
                class="member-login-callback-admin">

                Zum Admin-Bereich

              </a>
            </p>
          `
          : ''
      );

  const banner =
    document.createElement('div');

  banner.className =
    'member-login-callback-banner';

  banner.innerHTML = `

<p>
  <strong>Login erfolgreich.</strong>
  Du kannst diesen Tab schließen und im ursprünglichen Tab weiterarbeiten.
</p>

${adminLink}

`;

  heading.insertAdjacentElement(
    'afterend',
    banner
  );

  if (
    nextUrl
    && nextUrl.startsWith('/admin')
  ) {
    sessionStorage.removeItem('adminReturnUrl');
  }

}

function setupConsentInfoDialogs() {

  const root =
    document.getElementById('member-profile');

  if (!root) {
    return;
  }

  if (root.dataset.consentDialogsBound === 'true') {
    return;
  }

  root.dataset.consentDialogsBound = 'true';

  root.addEventListener(
    'click',
    (event) => {

      const trigger =
        event.target.closest(
          '[data-consent-dialog]'
        );

      if (trigger) {

        event.preventDefault();
        event.stopPropagation();

        openMemberConsentModal(
          trigger.dataset.consentDialog
        );

        return;

      }

      const closeTarget =
        event.target.closest(
          '.member-consent-modal__backdrop, '
          + '.member-consent-dialog__close, '
          + '.member-consent-dialog__close-btn'
        );

      if (!closeTarget) {
        return;
      }

      const modal =
        closeTarget.closest(
          '.member-consent-modal'
        );

      closeMemberConsentModal(modal);

    }
  );

  document.addEventListener(
    'keydown',
    (event) => {

      if (event.key !== 'Escape') {
        return;
      }

      const openModal =
        document.querySelector(
          '.member-consent-modal:not([hidden])'
        );

      closeMemberConsentModal(openModal);

    }
  );

}

function bindMemberProfileEvents(
  member,
  pushState = {}
) {

  async function refreshProfilePushState() {

    const currentMember =
      getCurrentMember();

    const currentPushState =
      await resolveMemberPushState(
        currentMember
      );

    renderMemberProfile(
      currentMember,
      currentPushState
    );

    bindMemberProfileEvents(
      currentMember,
      currentPushState
    );

    return currentPushState;

  }

  const form =
    document.getElementById(
      'member-edit-form'
    );

  const statusEl =
    document.getElementById(
      'member-save-status'
    );

  if (form) {

    form.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();

        const submitBtn =
          form.querySelector(
            '[type="submit"]'
          );

        if (submitBtn) {
          submitBtn.disabled = true;
        }

        if (statusEl) {
          statusEl.hidden = true;
        }

        try {

          const formData =
            new FormData(form);

          const updated =
            await updateMemberContactFields(
              member.id,
              {
                strasse:
                  formData.get('strasse'),
                hausnummer:
                  formData.get('hausnummer'),
                plz:
                  formData.get('plz'),
                wohnort:
                  formData.get('wohnort'),
                telefonnummer:
                  formData.get('telefonnummer')
              }
            );

          applyMemberUpdate(updated);

          if (statusEl) {
            statusEl.textContent =
              'Änderungen gespeichert.';
            statusEl.hidden = false;
          }

          showMemberToast(
            'Änderungen gespeichert.',
            'success',
            3000
          );

        } catch (error) {

          console.error(error);

          if (statusEl) {
            statusEl.textContent =
              'Speichern fehlgeschlagen.';
            statusEl.hidden = false;
          }

          showMemberToast(
            'Speichern fehlgeschlagen.',
            'error'
          );

        }

        if (submitBtn) {
          submitBtn.disabled = false;
        }

      }
    );

  }

  document
    .querySelectorAll('[data-consent]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        async () => {

          const kind =
            button.dataset.consent;

          button.disabled = true;

          try {

            const updated =
              await grantMemberConsent(
                member.id,
                kind,
                getCurrentMember()
              );

            if (!updated) {
              return;
            }

            applyMemberUpdate(updated);

            await refreshProfilePushState();

            showMemberToast(
              'Einwilligung gespeichert.',
              'success',
              3000
            );

          } catch (error) {

            console.error(error);

            showMemberToast(
              'Einwilligung konnte nicht gespeichert werden.',
              'error'
            );

            button.disabled = false;

          }

        }
      );

    });

  const pushBtn =
    document.getElementById(
      'member-push-enable'
    );

  if (pushBtn) {

    pushBtn.addEventListener(
      'click',
      async () => {

        pushBtn.disabled = true;

        try {

          const result =
            await subscribeUserToPush({
              memberId: member.id
            });

          if (!result.ok) {

            let message =
              'Push konnte nicht bestellt werden.';

            if (result.reason === 'permission_denied') {
              message =
                'Benachrichtigungen wurden nicht erlaubt.';
            }

            if (result.reason === 'unsupported') {
              message =
                'Push-Mitteilungen werden in diesem Browser nicht unterstützt.';
            }

            showMemberToast(
              message,
              'error'
            );

            pushBtn.disabled = false;

            return;

          }

          await refreshProfilePushState();

          showMemberToast(
            'Push bestellt.',
            'success',
            3000
          );

        } catch (error) {

          console.error(error);

          showMemberToast(
            'Push konnte nicht bestellt werden.',
            'error'
          );

          pushBtn.disabled = false;

        }

      }
    );

  }

  const pushDisableBtn =
    document.getElementById(
      'member-push-disable'
    );

  if (pushDisableBtn) {

    pushDisableBtn.addEventListener(
      'click',
      async () => {

        pushDisableBtn.disabled = true;

        try {

          const result =
            await unsubscribeUserFromPush();

          if (!result.ok) {

            let message =
              'Push konnte nicht abbestellt werden.';

            if (result.reason === 'not_subscribed') {
              message =
                'Keine Push-Mitteilung aktiv.';
            }

            if (result.reason === 'unsupported') {
              message =
                'Push-Mitteilungen werden in diesem Browser nicht unterstützt.';
            }

            showMemberToast(
              message,
              'error'
            );

            pushDisableBtn.disabled = false;

            return;

          }

          await refreshProfilePushState();

          showMemberToast(
            'Push abbestellt.',
            'success',
            3000
          );

        } catch (error) {

          console.error(error);

          showMemberToast(
            'Push konnte nicht abbestellt werden.',
            'error'
          );

          pushDisableBtn.disabled = false;

        }

      }
    );

  }

  const logoutBtn =
    document.getElementById(
      'member-logout-btn'
    );

  if (logoutBtn) {

    logoutBtn.addEventListener(
      'click',
      async () => {

        await logoutMember();

        window.location.href = '/';

      }
    );

  }

  const deleteAccountBtn =
    document.getElementById(
      'member-delete-account-btn'
    );

  if (deleteAccountBtn) {

    deleteAccountBtn.addEventListener(
      'click',
      async () => {

        const confirmed =
          confirm(
            'Account wirklich löschen?\n\n'
            + 'Name, E-Mail und Telefon werden entfernt. '
            + 'Abstimmungen bleiben anonym gezählt. '
            + 'Du wirst abgemeldet.'
          );

        if (!confirmed) {
          return;
        }

        deleteAccountBtn.disabled = true;

        try {

          if (
            typeof anonymizeMemberAccount
              !== 'function'
          ) {
            throw new Error(
              'Account-Löschung ist nicht verfügbar.'
            );
          }

          const result =
            await anonymizeMemberAccount();

          if (result?.error) {
            throw result.error;
          }

          await logoutMember();

          showMemberToast(
            'Account gelöscht.',
            'success',
            4000
          );

          window.setTimeout(() => {

            window.location.href = '/';

          }, 800);

        } catch (error) {

          console.error(error);

          showMemberToast(
            error.message
              || 'Account konnte nicht gelöscht werden.',
            'error'
          );

          deleteAccountBtn.disabled = false;

        }

      }
    );

  }

}

async function loadMemberProfilePage() {

  renderMemberProfileLoading();

  const member =
    await ensureMemberSession({
      strict: true
    });

  if (!member) {

    window.setTimeout(() => {

      window.location.href = '/';

    }, 2500);

    return;

  }

  document.title =
    `Mein Profil · MTB Werdohl`;

  const pushState =
    await resolveMemberPushState(member);

  renderMemberProfile(
    member,
    pushState
  );

  bindMemberProfileEvents(
    member,
    pushState
  );

  setupConsentInfoDialogs();

  showLoginCallbackNotice(member);

}

document.addEventListener(
  'DOMContentLoaded',
  loadMemberProfilePage
);
