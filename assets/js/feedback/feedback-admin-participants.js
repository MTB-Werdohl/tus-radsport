function formatParticipantAdminEmail(
  email
) {

  if (
    typeof isGuestInternalEmail === 'function'
    && isGuestInternalEmail(email)
  ) {
    return '—';
  }

  return email || '—';

}

function buildEditableEventParticipantRows(
  module,
  answers
) {

  const yes =
    window.siteConfig.feedback.answers.yes;

  const maybe =
    window.siteConfig.feedback.answers.maybe;

  return (answers || [])
    .map((row) => {

      const answerCode =
        String(row.answer || '')
          .trim()
          .toLowerCase();

      if (
        answerCode !== yes
        && answerCode !== maybe
      ) {
        return null;
      }

      const member =
        row.members || {};

      return {
        memberId: row.member_id,
        name:
          typeof formatFeedbackMemberName
            === 'function'
            ? formatFeedbackMemberName(row)
            : 'Mitglied',
        email:
          formatParticipantAdminEmail(
            member.email
          ),
        answer: answerCode,
        answerLabel:
          typeof formatFeedbackAnswerLabel
            === 'function'
            ? formatFeedbackAnswerLabel(
              module,
              answerCode,
              false
            )
            : answerCode,
        rolle: member.rolle || '',
        isGuest:
          typeof isGuestMember === 'function'
            ? isGuestMember(member)
            : false,
        isIncognito:
          typeof isIncognitoGuestMember
            === 'function'
            ? isIncognitoGuestMember(member)
            : false,
        vorname: member.vorname || '',
        nachname: member.nachname || '',
        telefon:
          member.telefonnummer || ''
      };

    })
    .filter(Boolean)
    .sort((left, right) => {

      if (
        typeof compareFeedbackResultsRows
          === 'function'
      ) {
        return compareFeedbackResultsRows(
          left,
          right
        );
      }

      return String(left.name)
        .localeCompare(
          String(right.name),
          'de'
        );

    });

}

function renderParticipantAdminAddPanel(
  moduleId,
  clubMembers
) {

  const memberOptions =
    (clubMembers || [])
      .map((member) => {

        const name =
          [
            member.vorname,
            member.nachname
          ]
            .filter(Boolean)
            .join(' ')
            .trim();

        const label =
          name
            ? `${name} (${member.email})`
            : member.email;

        return `
<option value="${member.id}">
  ${escapeAdminHtml(label)}
</option>
`;

      })
      .join('');

  return `
<section
  class="feedback-participant-admin"
  data-feedback-participant-admin
  data-module-id="${moduleId}">

<h3 class="feedback-participant-admin__title">
  Teilnehmer hinzufügen
</h3>

<div class="feedback-participant-admin__tabs">

<label class="feedback-participant-admin__mode">

  <input
    type="radio"
    name="feedback-participant-add-mode"
    value="member"
    checked>

  Vereinsmitglied

</label>

<label class="feedback-participant-admin__mode">

  <input
    type="radio"
    name="feedback-participant-add-mode"
    value="guest">

  Gast (Walk-in, immer Ja)

</label>

</div>

<div
  class="feedback-participant-admin__panel"
  data-feedback-participant-panel="member">

<label class="admin-field">
  Mitglied
  <select
    data-feedback-participant-member-id>

    <option value="">
      Bitte wählen …
    </option>

    ${memberOptions}

  </select>
</label>

<label class="admin-field">
  Antwort
  <select data-feedback-participant-member-answer>

    <option value="yes">
      Ja
    </option>

    <option value="maybe">
      Interesse
    </option>

  </select>
</label>

</div>

<div
  class="feedback-participant-admin__panel"
  data-feedback-participant-panel="guest"
  hidden>

<label class="admin-field">
  Vorname
  <input
    type="text"
    data-feedback-participant-guest-vorname
    placeholder="Optional bei Inkognito">
</label>

<label class="admin-field">
  Nachname / Bezeichnung
  <input
    type="text"
    data-feedback-participant-guest-nachname
    placeholder="z. B. Unbekannter Fahrer">
</label>

<label class="admin-field feedback-participant-admin__checkbox">

  <input
    type="checkbox"
    data-feedback-participant-guest-incognito>

  Inkognito (nur für Vorstand sichtbar)

</label>

<p class="admin-hint">
  Walk-in-Gäste werden immer als
  <strong>Ja</strong>
  gezählt. Der Datensatz kann später
  mit Name, Telefon und E-Mail ergänzt
  werden — ohne Duplikat bei Anmeldung.
</p>

</div>

<button
  type="button"
  class="new-button"
  data-feedback-participant-add-submit>

  Hinzufügen

</button>

</section>
`;

}

function renderEditableParticipantTable(
  module,
  rows
) {

  if (!rows.length) {

    return `
<p class="admin-hint">
  Noch keine Teilnehmer auf der Liste.
</p>
`;

  }

  const body =
    rows
      .map((row) => {

        const sourceLabel =
          row.isGuest
            ? (
              row.isIncognito
                ? 'Gast (inkognito)'
                : 'Gast'
            )
            : 'Mitglied';

        const answerControl =
          row.isGuest
            ? `
<span class="feedback-participant-admin__fixed-answer">
  Ja
</span>
`
            : `
<select
  data-feedback-participant-answer
  data-member-id="${row.memberId}">

  <option
    value="yes"
    ${row.answer === 'yes' ? 'selected' : ''}>

    Ja

  </option>

  <option
    value="maybe"
    ${row.answer === 'maybe' ? 'selected' : ''}>

    Interesse

  </option>

</select>
`;

        const guestEditButton =
          row.isGuest
            ? `
<button
  type="button"
  class="secondary-button feedback-participant-admin__edit-guest"
  data-member-id="${row.memberId}"
  data-vorname="${escapeAdminHtml(row.vorname)}"
  data-nachname="${escapeAdminHtml(row.nachname)}"
  data-telefon="${escapeAdminHtml(row.telefon)}"
  data-incognito="${row.isIncognito ? 'true' : 'false'}">

  Bearbeiten

</button>
`
            : '';

        return `
<tr data-member-id="${row.memberId}">

<td>
  ${escapeAdminHtml(row.name)}
</td>

<td class="feedback-admin-answer-cell">
  ${answerControl}
</td>

<td>
  ${escapeAdminHtml(sourceLabel)}
</td>

<td class="feedback-participant-admin__actions">

  ${guestEditButton}

  <button
    type="button"
    class="secondary-button feedback-participant-admin__remove"
    data-member-id="${row.memberId}"
    data-member-name="${escapeAdminHtml(row.name)}">

    Entfernen

  </button>

</td>

</tr>
`;

      })
      .join('');

  return `
<div class="feedback-admin-table-wrap">

<table class="feedback-admin-table feedback-admin-table--results feedback-participant-admin__table">

<thead>

<tr>
  <th>Name</th>
  <th>Antwort</th>
  <th>Quelle</th>
  <th>Aktionen</th>
</tr>

</thead>

<tbody>
  ${body}
</tbody>

</table>

</div>
`;

}

async function renderEditableEventParticipants(
  module,
  answers,
  container,
  options = {}
) {

  const moduleId =
    module?.id;

  if (
    !moduleId
    || !container
  ) {
    return;
  }

  const displayRows =
    buildEditableEventParticipantRows(
      module,
      answers
    );

  const clubMembers =
    typeof fetchClubMembersForParticipantPicker
      === 'function'
      ? await fetchClubMembersForParticipantPicker()
      : [];

  const existingMemberIds =
    new Set(
      displayRows.map(
        (row) => row.memberId
      )
    );

  const availableMembers =
    clubMembers.filter(
      (member) =>
        !existingMemberIds.has(member.id)
    );

  const reload =
    typeof options.reload === 'function'
      ? options.reload
      : null;

  const notifyChanged =
    typeof options.onParticipantsChanged
      === 'function'
      ? options.onParticipantsChanged
      : null;

  container.innerHTML = `
<div class="feedback-admin-results-actions">

<button
  type="button"
  class="new-button"
  data-feedback-export-csv>

  CSV exportieren

</button>

</div>

${renderParticipantAdminAddPanel(
  moduleId,
  availableMembers
)}

<h2>
  Rückmeldungen
</h2>

${renderEditableParticipantTable(
  module,
  displayRows
)}
  `;

  container
    .querySelector('[data-feedback-export-csv]')
    ?.addEventListener('click', () => {

      if (
        typeof downloadFeedbackCsv
          !== 'function'
      ) {
        return;
      }

      downloadFeedbackCsv(
        module,
        displayRows.map((row) => ({
          name: row.name,
          email: row.email,
          answerLabel: row.answerLabel,
          firstAnswerAt: null,
          updatedAt: null,
          reasonLabel: null
        })),
        false
      );

    });

  bindEditableEventParticipants(
    container,
    moduleId,
    {
      reload,
      onParticipantsChanged:
        notifyChanged
    }
  );

}

async function runParticipantAdminAction(
  moduleId,
  payload,
  container,
  callbacks
) {

  if (
    typeof adminManageEventParticipant
      !== 'function'
  ) {

    alert(
      'Teilnehmer-Verwaltung ist nicht verfügbar. '
      + 'Bitte SQL-Migration ausführen '
      + '(supabase-admin-event-participants.sql).'
    );

    return;

  }

  const result =
    await adminManageEventParticipant({
      moduleId,
      ...payload
    });

  if (result?.error) {

    alert(
      result.error.message
        || 'Aktion fehlgeschlagen.'
    );

    return;

  }

  if (callbacks?.onParticipantsChanged) {
    callbacks.onParticipantsChanged();
  }

  if (callbacks?.reload) {
    await callbacks.reload();
  }

}

function bindEditableEventParticipants(
  container,
  moduleId,
  callbacks
) {

  const adminRoot =
    container.querySelector(
      '[data-feedback-participant-admin]'
    );

  adminRoot
    ?.querySelectorAll(
      'input[name="feedback-participant-add-mode"]'
    )
    .forEach((input) => {

      input.addEventListener('change', () => {

        const mode =
          adminRoot.querySelector(
            'input[name="feedback-participant-add-mode"]:checked'
          )?.value
          || 'member';

        adminRoot
          .querySelectorAll(
            '[data-feedback-participant-panel]'
          )
          .forEach((panel) => {

            panel.hidden =
              panel.dataset
                .feedbackParticipantPanel
              !== mode;

          });

        const guestIncognito =
          adminRoot.querySelector(
            '[data-feedback-participant-guest-incognito]'
          );

        const guestFields =
          adminRoot.querySelectorAll(
            '[data-feedback-participant-guest-vorname],'
            + '[data-feedback-participant-guest-nachname]'
          );

        if (
          guestIncognito
          && mode === 'guest'
        ) {

          guestFields.forEach((field) => {
            field.disabled =
              guestIncognito.checked;
          });

        }

      });

    });

  adminRoot
    ?.querySelector(
      '[data-feedback-participant-guest-incognito]'
    )
    ?.addEventListener('change', (event) => {

      const disabled =
        event.target.checked === true;

      adminRoot
        .querySelectorAll(
          '[data-feedback-participant-guest-vorname],'
          + '[data-feedback-participant-guest-nachname]'
        )
        .forEach((field) => {
          field.disabled = disabled;
        });

    });

  adminRoot
    ?.querySelector(
      '[data-feedback-participant-add-submit]'
    )
    ?.addEventListener('click', () => {

      void (async () => {

        const mode =
          adminRoot.querySelector(
            'input[name="feedback-participant-add-mode"]:checked'
          )?.value
          || 'member';

        if (mode === 'member') {

          const memberId =
            parseInt(
              adminRoot
                .querySelector(
                  '[data-feedback-participant-member-id]'
                )
                ?.value,
              10
            );

          const answer =
            adminRoot
              .querySelector(
                '[data-feedback-participant-member-answer]'
              )
              ?.value
            || 'yes';

          if (!memberId) {

            alert(
              'Bitte ein Mitglied wählen.'
            );

            return;

          }

          await runParticipantAdminAction(
            moduleId,
            {
              action: 'add_member',
              memberId,
              answer
            },
            container,
            callbacks
          );

          return;

        }

        const incognito =
          adminRoot
            .querySelector(
              '[data-feedback-participant-guest-incognito]'
            )
            ?.checked === true;

        const vorname =
          adminRoot
            .querySelector(
              '[data-feedback-participant-guest-vorname]'
            )
            ?.value
            ?.trim()
          || '';

        const nachname =
          adminRoot
            .querySelector(
              '[data-feedback-participant-guest-nachname]'
            )
            ?.value
            ?.trim()
          || '';

        if (
          !incognito
          && !vorname
          && !nachname
        ) {

          alert(
            'Bitte Name angeben oder Inkognito wählen.'
          );

          return;

        }

        await runParticipantAdminAction(
          moduleId,
          {
            action: 'add_guest',
            vorname,
            nachname,
            incognito
          },
          container,
          callbacks
        );

      })();

    });

  container
    .querySelectorAll(
      '[data-feedback-participant-answer]'
    )
    .forEach((select) => {

      select.addEventListener('change', () => {

        void (async () => {

          const memberId =
            parseInt(
              select.dataset.memberId,
              10
            );

          if (!memberId) {
            return;
          }

          await runParticipantAdminAction(
            moduleId,
            {
              action: 'set_answer',
              memberId,
              answer: select.value
            },
            container,
            callbacks
          );

        })();

      });

    });

  container
    .querySelectorAll(
      '.feedback-participant-admin__remove'
    )
    .forEach((button) => {

      button.addEventListener('click', () => {

        const memberId =
          parseInt(
            button.dataset.memberId,
            10
          );

        const memberName =
          button.dataset.memberName
          || 'Teilnehmer';

        if (
          !memberId
          || !confirm(
            `${memberName} von der Liste entfernen?`
          )
        ) {
          return;
        }

        void runParticipantAdminAction(
          moduleId,
          {
            action: 'remove',
            memberId
          },
          container,
          callbacks
        );

      });

    });

  container
    .querySelectorAll(
      '.feedback-participant-admin__edit-guest'
    )
    .forEach((button) => {

      button.addEventListener('click', () => {

        void (async () => {

          const memberId =
            parseInt(
              button.dataset.memberId,
              10
            );

          if (!memberId) {
            return;
          }

          const currentIncognito =
            button.dataset.incognito === 'true';

          let vorname =
            button.dataset.vorname || '';

          let nachname =
            button.dataset.nachname || '';

          let telefon =
            button.dataset.telefon || '';

          const incognitoToggle =
            confirm(
              currentIncognito
                ? 'Als benannter Gast speichern? (Inkognito aus)'
                : 'Als Inkognito markieren?'
            );

          const incognito =
            incognitoToggle
              ? !currentIncognito
              : currentIncognito;

          if (!incognito) {

            const nextVorname =
              prompt('Vorname', vorname);

            if (nextVorname === null) {
              return;
            }

            vorname = nextVorname.trim();

            const nextNachname =
              prompt(
                'Nachname / Bezeichnung',
                nachname
              );

            if (nextNachname === null) {
              return;
            }

            nachname = nextNachname.trim();

          } else {

            vorname = '';
            nachname = nachname || 'Gast';

            const nextLabel =
              prompt(
                'Bezeichnung (optional)',
                nachname === 'Gast'
                  ? ''
                  : nachname
              );

            if (nextLabel === null) {
              return;
            }

            nachname = nextLabel.trim();

          }

          const nextTelefon =
            prompt(
              'Telefon (optional)',
              telefon
            );

          if (nextTelefon === null) {
            return;
          }

          telefon = nextTelefon.trim();

          const nextEmail =
            prompt(
              'E-Mail (optional — für späteren Zugang)',
              ''
            );

          if (nextEmail === null) {
            return;
          }

          await runParticipantAdminAction(
            moduleId,
            {
              action: 'update_guest',
              memberId,
              vorname,
              nachname,
              telefon,
              email: nextEmail.trim(),
              incognito
            },
            container,
            callbacks
          );

        })();

      });

    });

}
