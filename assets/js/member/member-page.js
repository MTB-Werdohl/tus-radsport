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

function showStravaReturnNotice() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const result =
    params.get('strava');

  if (!result) {
    return;
  }

  profileActiveTab = 'strava';

  const reason =
    params.get('reason');

  if (result === 'connected') {

    showMemberToast(
      'Strava verbunden — Touren werden importiert. Feed-Freigabe im Tab Strava aktivieren.',
      'success',
      8000
    );

  }

  if (result === 'error') {

    const messages = {
      access_denied:
        'Strava-Verbindung abgebrochen.',
      athlete_linked:
        'Dieses Strava-Konto ist bereits mit einem anderen Mitglied verbunden.',
      invalid_state:
        'Die Anmeldung ist abgelaufen. Bitte erneut versuchen.',
      missing_code:
        'Strava hat keine Bestätigung gesendet.',
      token_payload:
        'Strava-Antwort unvollständig.',
      server:
        'Verbindung fehlgeschlagen. Bitte später erneut versuchen.'
    };

    showMemberToast(
      messages[reason]
      || 'Strava-Verbindung fehlgeschlagen.',
      'error',
      6000
    );

  }

  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}`
  );

}

async function maybePollInitialStravaSync(member) {

  const status =
    profileStravaState?.status;

  if (
    !status?.connected
    || status.initialSyncCompleted
  ) {
    return;
  }

  if (
    status.syncStatus !== 'syncing'
    && status.syncStatus !== 'pending'
  ) {
    return;
  }

  const completion =
    await waitForStravaSyncCompletion(status);

  if (completion.completed) {

    showMemberToast(
      'Strava-Import abgeschlossen.',
      'success',
      5000
    );

  } else if (completion.error) {

    showMemberToast(
      completion.error,
      'error',
      6000
    );

  }

  await reloadStravaProfileView(
    getCurrentMember() || member
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

let profileStravaState = null;
let profileActiveTab = 'profil';
let memberActivitiesLoaded = false;
let memberVotesLoaded = false;

async function loadMemberVotesIfNeeded(
  force = false
) {

  const container =
    document.getElementById(
      'member-votes-list'
    );

  if (!container) {
    return;
  }

  if (
    memberVotesLoaded
    && !force
  ) {
    return;
  }

  const member =
    getCurrentMember();

  if (!member?.id) {
    return;
  }

  container.innerHTML = `
<p>Teilnahmen werden geladen …</p>
  `;

  try {

    const grouped =
      await fetchMemberVotesGrouped(
        member.id
      );

    memberVotesLoaded = true;

    renderMemberVotesList(
      container,
      grouped,
      1
    );

  } catch (error) {

    console.error(error);

    container.innerHTML = `
<p class="member-strava-hint member-strava-hint--error">
  ${escapeMemberHtml(
    error?.message
    || 'Teilnahmen konnten nicht geladen werden.'
  )}
</p>
    `;

  }

}

async function loadMemberActivitiesIfNeeded(
  force = false
) {

  const container =
    document.getElementById(
      'member-activities-list'
    );

  if (!container) {
    return;
  }

  if (
    memberActivitiesLoaded
    && !force
  ) {
    return;
  }

  container.innerHTML = `
<p>Aktivitäten werden geladen …</p>
  `;

  try {

    const payload =
      await fetchMemberActivities();

    memberActivitiesLoaded = true;

    renderMemberActivitiesList(
      container,
      payload
    );

  } catch (error) {

    console.error(error);

    container.innerHTML = `
<p class="member-strava-hint member-strava-hint--error">
  ${escapeMemberHtml(
    error?.message
    || 'Aktivitäten konnten nicht geladen werden.'
  )}
</p>
    `;

  }

}

function switchMemberProfileTab(
  tabId
) {

  profileActiveTab = tabId;

  document
    .querySelectorAll('[data-profile-tab]')
    .forEach((button) => {

      const isActive =
        button.dataset.profileTab === tabId;

      button.classList.toggle(
        'is-active',
        isActive
      );

      button.setAttribute(
        'aria-selected',
        isActive ? 'true' : 'false'
      );

    });

  document
    .querySelectorAll('[data-profile-panel]')
    .forEach((panel) => {

      panel.hidden =
        panel.dataset.profilePanel !== tabId;

    });

  if (tabId === 'abstimmungen') {
    void loadMemberVotesIfNeeded();
  }

  if (tabId === 'aktivitaeten') {
    void loadMemberActivitiesIfNeeded();
  }

}

async function reloadStravaProfileView(
  member
) {

  if (
    typeof isClubMember === 'function'
    && !isClubMember(member)
  ) {
    return;
  }

  profileStravaState =
    await fetchStravaProfileStatus();

  memberActivitiesLoaded = false;
  memberVotesLoaded = false;

  profileActiveTab =
    resolveMemberProfileActiveTab(
      profileActiveTab,
      profileStravaState
    );

  renderMemberProfile(
    member,
    {
      stravaState: profileStravaState,
      activeTab: profileActiveTab
    }
  );

  bindMemberProfileEvents(member);

  setupConsentInfoDialogs();

  if (
    typeof isClubMember === 'function'
    && isClubMember(member)
  ) {
    void maybePollInitialStravaSync(member);

    if (profileActiveTab === 'aktivitaeten') {
      void loadMemberActivitiesIfNeeded(true);
    }

    if (profileActiveTab === 'abstimmungen') {
      void loadMemberVotesIfNeeded(true);
    }

  }

}

function bindMemberProfileTabEvents() {

  document
    .querySelectorAll('[data-profile-tab]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          switchMemberProfileTab(
            button.dataset.profileTab
          );

        }
      );

    });

}

function syncStravaVisibilityCheckboxes(
  status
) {

  const container =
    document.getElementById(
      'strava-visibility-form'
    );

  if (!container || !status) {
    return;
  }

  const publishFeedInput =
    container.querySelector(
      '[name="publish_feed"]'
    );

  const publishRankingsInput =
    container.querySelector(
      '[name="publish_rankings"]'
    );

  const contributeInput =
    container.querySelector(
      '[name="contribute_to_club_goals"]'
    );

  if (publishFeedInput) {
    publishFeedInput.checked =
      status.publishFeed === true;
  }

  if (publishRankingsInput) {
    publishRankingsInput.checked =
      status.publishRankings === true;
  }

  if (contributeInput) {
    contributeInput.checked =
      status.contributeToClubGoals === true;
  }

}

async function saveStravaVisibilityFromForm() {

  const container =
    document.getElementById(
      'strava-visibility-form'
    );

  if (!container) {
    return;
  }

  const publishFeed =
    container.querySelector(
      '[name="publish_feed"]'
    )?.checked === true;

  const publishRankings =
    container.querySelector(
      '[name="publish_rankings"]'
    )?.checked === true;

  const contributeToClubGoals =
    container.querySelector(
      '[name="contribute_to_club_goals"]'
    )?.checked === true;

  profileStravaState = {
    available: true,
    status:
      await updateStravaVisibility({
        publishFeed,
        publishRankings,
        contributeToClubGoals
      })
  };

  memberActivitiesLoaded = false;

}

function bindStravaProfileEvents(
  member
) {

  const connectBtn =
    document.getElementById(
      'strava-connect-btn'
    );

  if (connectBtn) {

    connectBtn.addEventListener(
      'click',
      async () => {

        connectBtn.disabled = true;

        try {

          await beginStravaConnect();

        } catch (error) {

          console.error(error);

          showMemberToast(
            error.message
              || 'Strava-Verbindung fehlgeschlagen.',
            'error'
          );

          connectBtn.disabled = false;

        }

      }
    );

  }

  const visibilityForm =
    document.getElementById(
      'strava-visibility-form'
    );

  if (visibilityForm) {

    visibilityForm
      .querySelectorAll(
        'input[type="checkbox"]'
      )
      .forEach((checkbox) => {

        checkbox.addEventListener(
          'change',
          async () => {

            const previousStatus =
              profileStravaState?.status
              || {};

            const inputs =
              visibilityForm.querySelectorAll(
                'input[type="checkbox"]'
              );

            inputs.forEach((input) => {
              input.disabled = true;
            });

            try {

              await saveStravaVisibilityFromForm();

              showMemberToast(
                'Sichtbarkeit gespeichert.',
                'success',
                3000
              );

            } catch (error) {

              console.error(error);

              syncStravaVisibilityCheckboxes(
                previousStatus
              );

              showMemberToast(
                'Speichern fehlgeschlagen.',
                'error'
              );

            }

            inputs.forEach((input) => {
              input.disabled = false;
            });

          }
        );

      });

  }

  const retrySyncBtn =
    document.getElementById(
      'strava-retry-sync-btn'
    );

  if (retrySyncBtn) {

    retrySyncBtn.addEventListener(
      'click',
      async () => {

        retrySyncBtn.disabled = true;

        try {

          const previousState =
            profileStravaState?.status || {};

          const result =
            await retryStravaSync();

          showMemberToast(
            result?.message
              || 'Synchronisierung gestartet.',
            result?.ok ? 'success' : 'error',
            5000
          );

          if (result?.ok) {

            const completion =
              await waitForStravaSyncCompletion(
                previousState
              );

            if (completion.completed) {
              showMemberToast(
                'Synchronisation abgeschlossen.',
                'success',
                5000
              );
            } else if (completion.error) {
              showMemberToast(
                completion.error,
                'error',
                6000
              );
            }

            await reloadStravaProfileView(member);

          }

        } catch (error) {

          console.error(error);

          showMemberToast(
            error.message
              || 'Synchronisierung fehlgeschlagen.',
            'error'
          );

        }

        retrySyncBtn.disabled = false;

      }
    );

  }

  const disconnectBtn =
    document.getElementById(
      'strava-disconnect-btn'
    );

  const disconnectWarning =
    document.getElementById(
      'strava-disconnect-warning'
    );

  const disconnectCancelBtn =
    document.getElementById(
      'strava-disconnect-cancel-btn'
    );

  const disconnectConfirmBtn =
    document.getElementById(
      'strava-disconnect-confirm-btn'
    );

  if (
    disconnectBtn
    && disconnectWarning
  ) {

    disconnectBtn.addEventListener(
      'click',
      () => {

        disconnectWarning.hidden = false;
        disconnectBtn.hidden = true;

      }
    );

  }

  if (
    disconnectCancelBtn
    && disconnectWarning
    && disconnectBtn
  ) {

    disconnectCancelBtn.addEventListener(
      'click',
      () => {

        disconnectWarning.hidden = true;
        disconnectBtn.hidden = false;

      }
    );

  }

  if (disconnectConfirmBtn) {

    disconnectConfirmBtn.addEventListener(
      'click',
      async () => {

        disconnectConfirmBtn.disabled = true;

        try {

          await disconnectStravaAccount();

          showMemberToast(
            'Strava-Verbindung getrennt.',
            'success',
            4000
          );

          profileActiveTab = 'strava';

          await reloadStravaProfileView(
            getCurrentMember() || member
          );

        } catch (error) {

          console.error(error);

          showMemberToast(
            error.message
              || 'Trennen fehlgeschlagen.',
            'error'
          );

          disconnectConfirmBtn.disabled = false;

        }

      }
    );

  }

}

function setMemberAvatarStatus(
  message,
  type
) {

  const statusEl =
    document.getElementById(
      'member-avatar-status'
    );

  if (!statusEl) {
    return;
  }

  statusEl.textContent = message || '';
  statusEl.hidden = !message;

  statusEl.classList.remove(
    'member-save-status--error',
    'member-save-status--success'
  );

  if (type === 'error') {
    statusEl.classList.add('member-save-status--error');
  }

  if (type === 'success') {
    statusEl.classList.add('member-save-status--success');
  }

}

function bindMemberAvatarEvents(
  member
) {

  const fileInput =
    document.getElementById(
      'member-avatar-file'
    );

  const toggleBtn =
    document.getElementById(
      'member-avatar-toggle-btn'
    );

  if (!fileInput || !toggleBtn) {
    return;
  }

  toggleBtn.addEventListener(
    'click',
    async () => {

      const currentMember =
        getCurrentMember()
        || member;

      if (currentMember?.avatar_storage_path) {

        if (
          !window.confirm(
            'Profilbild wirklich entfernen?'
          )
        ) {
          return;
        }

        setMemberAvatarStatus(
          'Profilbild wird entfernt …'
        );

        toggleBtn.disabled = true;

        try {

          const updated =
            await removeMemberAvatar(
              currentMember
            );

          applyMemberUpdate(updated);

          await reloadStravaProfileView(updated);

          setMemberAvatarStatus(
            'Profilbild entfernt.',
            'success'
          );

        } catch (error) {

          console.error(error);

          setMemberAvatarStatus(
            error?.message
              || 'Entfernen fehlgeschlagen.',
            'error'
          );

        }

        toggleBtn.disabled = false;

        return;

      }

      fileInput.click();

    }
  );

  fileInput.addEventListener(
    'change',
    async () => {

      const file =
        fileInput.files?.[0];

      fileInput.value = '';

      if (!file) {
        return;
      }

      const confirmed =
        window.confirm(
          'Dein Profilbild wird öffentlich auf der Website angezeigt '
          + '(Feed, Rankings, Teilnehmerlisten, Profil). '
          + 'Möchtest du fortfahren?'
        );

      if (!confirmed) {
        return;
      }

      setMemberAvatarStatus(
        'Profilbild wird hochgeladen …'
      );

      toggleBtn.disabled = true;

      try {

        const updated =
          await uploadMemberAvatar(
            file,
            member.id
          );

        applyMemberUpdate(updated);

        await reloadStravaProfileView(updated);

        setMemberAvatarStatus(
          'Profilbild gespeichert.',
          'success'
        );

      } catch (error) {

        console.error(error);

        setMemberAvatarStatus(
          error?.message
            || 'Upload fehlgeschlagen.',
          'error'
        );

      }

      toggleBtn.disabled = false;

    }
  );

}

function bindMemberProfileEvents(
  member
) {

  async function refreshMemberProfile() {

    const currentMember =
      getCurrentMember();

    if (
      typeof isClubMember === 'function'
      && isClubMember(currentMember)
    ) {

      await reloadStravaProfileView(
        currentMember
      );

      return;

    }

    renderMemberProfile(currentMember);

    bindMemberProfileEvents(currentMember);

  }

  bindMemberProfileTabEvents();

  bindStravaProfileEvents(member);

  bindMemberAvatarEvents(member);

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

            await refreshMemberProfile();

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

  try {

    const member =
      await ensureMemberSession({
        strict: true
      });

    if (
      typeof isAdminPreviewActive === 'function'
      && isAdminPreviewActive()
      && typeof getAdminPreviewRole === 'function'
      && getAdminPreviewRole() === 'public'
    ) {

      renderMemberProfileGuestLogin();

      return;

    }

    if (!member) {

      renderMemberProfileGuestLogin();

      return;

    }

    if (
      handleMemberReturnRedirect(member)
    ) {
      return;
    }

    document.title =
      `Mein Profil · MTB Werdohl`;

    showStravaReturnNotice();

    if (
      typeof isClubMember === 'function'
      && isClubMember(member)
    ) {

      profileStravaState =
        await fetchStravaProfileStatus();

      profileActiveTab =
        resolveMemberProfileActiveTab(
          profileActiveTab,
          profileStravaState
        );

      renderMemberProfile(
        member,
        {
          stravaState: profileStravaState,
          activeTab: profileActiveTab
        }
      );

    } else {

      renderMemberProfile(member);

    }

    bindMemberProfileEvents(member);

    setupConsentInfoDialogs();

    showLoginCallbackNotice(member);

    if (
      typeof isClubMember === 'function'
      && isClubMember(member)
    ) {
      void maybePollInitialStravaSync(member);

      if (profileActiveTab === 'aktivitaeten') {
        void loadMemberActivitiesIfNeeded(true);
      }

      if (profileActiveTab === 'abstimmungen') {
        void loadMemberVotesIfNeeded(true);
      }

    }

  } catch (error) {

    console.error(error);

    const container =
      document.getElementById(
        'member-profile'
      );

    if (!container) {
      return;
    }

    container.innerHTML = `
<p class="member-strava-hint member-strava-hint--error">
  ${escapeMemberHtml(
    error?.message
    || 'Profil konnte nicht geladen werden.'
  )}
</p>
    `;

  }

}

document.addEventListener(
  'DOMContentLoaded',
  loadMemberProfilePage
);
