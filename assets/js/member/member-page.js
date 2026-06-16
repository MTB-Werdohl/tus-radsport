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

let profileActiveTab = 'profil';
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
      grouped
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

  if (tabId === 'termin') {

    const terminId =
      new URLSearchParams(
        window.location.search
      ).get('id');

    void initMemberTerminEditTab(
      getCurrentMember(),
      { terminId }
    );

  }

  if (tabId === 'verwaltung') {

    if (
      typeof initMemberVerwaltungTab
        === 'function'
    ) {
      void initMemberVerwaltungTab();
    }

  }

  if (tabId === 'email') {

    if (
      typeof initMemberEmailTab === 'function'
    ) {
      void initMemberEmailTab();
    }

  }

}

async function refreshMemberProfileView(
  member
) {

  if (
    typeof isClubMember === 'function'
    && !isClubMember(member)
  ) {
    return;
  }

  memberVotesLoaded = false;

  profileActiveTab =
    resolveMemberProfileActiveTab(
      profileActiveTab
    );

  renderMemberProfile(
    member,
    {
      activeTab: profileActiveTab
    }
  );

  bindMemberProfileEvents(member);

  setupConsentInfoDialogs();

  if (
    typeof isClubMember === 'function'
    && isClubMember(member)
  ) {

    if (profileActiveTab === 'abstimmungen') {
      void loadMemberVotesIfNeeded(true);
    }

    if (profileActiveTab === 'termin') {

      const terminId =
        new URLSearchParams(
          window.location.search
        ).get('id');

      void initMemberTerminEditTab(
        member,
        { terminId }
      );

    }

    if (
      profileActiveTab === 'verwaltung'
      && typeof initMemberVerwaltungTab
        === 'function'
    ) {
      void initMemberVerwaltungTab();
    }

    if (
      profileActiveTab === 'email'
      && typeof initMemberEmailTab === 'function'
    ) {
      void initMemberEmailTab();
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

      await refreshMemberProfileView(
        currentMember
      );

      return;

    }

    renderMemberProfile(currentMember);

    bindMemberProfileEvents(currentMember);

  }

  bindMemberProfileTabEvents();

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
      'Mein Profil · MTB Werdohl';

    if (
      typeof isClubMember === 'function'
      && isClubMember(member)
    ) {

      const urlTab =
        new URLSearchParams(
          window.location.search
        ).get('tab');

      if (
        urlTab === 'termin'
        || urlTab === 'content'
      ) {
        profileActiveTab = 'termin';
      } else if (urlTab) {
        profileActiveTab = urlTab;
      }

      profileActiveTab =
        resolveMemberProfileActiveTab(
          profileActiveTab
        );

      renderMemberProfile(
        member,
        {
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

      if (profileActiveTab === 'abstimmungen') {
        void loadMemberVotesIfNeeded(true);
      }

      if (profileActiveTab === 'termin') {

        const terminId =
          new URLSearchParams(
            window.location.search
          ).get('id');

        void initMemberTerminEditTab(
          member,
          { terminId }
        );

      }

      if (
        profileActiveTab === 'verwaltung'
        && typeof initMemberVerwaltungTab
          === 'function'
      ) {
        void initMemberVerwaltungTab();
      }

      if (
        profileActiveTab === 'email'
        && typeof initMemberEmailTab
          === 'function'
      ) {
        void initMemberEmailTab();
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

function reloadAfterVorstandContentSave() {

  const path =
    window.location.pathname
      .replace(/\/$/, '');

  if (path === '/profil') {

    window.location.href =
      '/profil/?tab=termin';

    return;

  }

  window.location.reload();

}

document.addEventListener(
  'DOMContentLoaded',
  loadMemberProfilePage
);
