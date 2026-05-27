function bindMemberProfileEvents(
  member,
  pushState = {}
) {

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
              'Push-Mitteilungen konnten nicht aktiviert werden.';

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

          showMemberToast(
            'Push-Mitteilungen aktiviert.',
            'success',
            3000
          );

        } catch (error) {

          console.error(error);

          showMemberToast(
            'Push-Mitteilungen konnten nicht aktiviert werden.',
            'error'
          );

          pushBtn.disabled = false;

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

}

document.addEventListener(
  'DOMContentLoaded',
  loadMemberProfilePage
);
