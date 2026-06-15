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

  Inkognito

</label>

<p class="admin-hint">
  <strong>Inkognito:</strong>
  Der Gast zählt als
  <strong>Ja</strong>,
  erscheint aber ohne Klarnamen in der
  Liste — nur für euch als Vorstand
  sichtbar (z.&nbsp;B. „Unbekannter Fahrer“).
  Später können Name, Telefon und E-Mail
  ergänzt werden, ohne neuen Datensatz.
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
  data-module-id="${module?.id || ''}">

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

function renderWithdrawnParticipantsSection(
  rows
) {

  if (!rows?.length) {
    return '';
  }

  const body =
    rows
      .map((row) => `
<tr>

<td>
  ${escapeAdminHtml(row.name)}
</td>

<td class="feedback-admin-answer-cell">
  ${escapeAdminHtml(row.answerLabel)}
</td>

<td>
  ${escapeAdminHtml(row.reasonLabel || '—')}
</td>

</tr>
`)
      .join('');

  return `
<section class="feedback-participant-admin-withdrawn">

<h3>
  Absagen / keine Teilnahme
</h3>

<p class="admin-hint">
  Personen, die abgesagt haben oder nicht
  mehr auf der Teilnehmerliste stehen —
  nur zur Information, nicht editierbar.
</p>

<div class="feedback-admin-table-wrap">

<table class="feedback-admin-table feedback-admin-table--results feedback-participant-admin__table feedback-participant-admin__table--withdrawn">

<thead>

<tr>
  <th>Name</th>
  <th>Status</th>
  <th>Grund</th>
</tr>

</thead>

<tbody>
  ${body}
</tbody>

</table>

</div>

</section>
`;

}

function buildWithdrawnParticipantDisplayRows(
  module,
  answers,
  displayRows,
  participationEvents
) {

  let withdrawnRows =
    [];

  if (
    typeof buildFeedbackResultsDisplayRows
      === 'function'
  ) {

    const historyRows =
      buildFeedbackResultsDisplayRows(
        module,
        answers,
        participationEvents || [],
        false
      );

    withdrawnRows =
      historyRows.filter(
        (row) =>
          row.answerLabel === 'Nein'
      );

  }

  const yes =
    window.siteConfig.feedback.answers.yes;

  const maybe =
    window.siteConfig.feedback.answers.maybe;

  const activeMemberIds =
    new Set(
      displayRows.map(
        (row) => row.memberId
      )
    );

  const withdrawnNames =
    new Set(
      withdrawnRows.map(
        (row) => row.name
      )
    );

  (answers || []).forEach((row) => {

    const memberId =
      row.member_id;

    if (
      !memberId
      || activeMemberIds.has(memberId)
    ) {
      return;
    }

    const answerCode =
      String(row.answer || '')
        .trim()
        .toLowerCase();

    if (
      !answerCode
      || answerCode === yes
      || answerCode === maybe
    ) {
      return;
    }

    const name =
      typeof formatFeedbackMemberName
        === 'function'
        ? formatFeedbackMemberName(row)
        : 'Mitglied';

    if (withdrawnNames.has(name)) {
      return;
    }

    withdrawnNames.add(name);

    withdrawnRows.push({
      name,
      answerLabel:
        typeof formatFeedbackAnswerLabel
          === 'function'
          ? formatFeedbackAnswerLabel(
            module,
            answerCode,
            false
          )
          : 'Nein',
      reasonLabel:
        String(row.comment || '')
          .trim()
        || '—'
    });

  });

  if (
    typeof compareFeedbackResultsRows
      === 'function'
  ) {
    withdrawnRows.sort(
      compareFeedbackResultsRows
    );
  }

  return withdrawnRows;

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

  let withdrawnRows =
    [];

  if (
    typeof listFeedbackParticipationChanges
      === 'function'
  ) {

    const changeResult =
      await listFeedbackParticipationChanges({
        moduleId,
        limit: 500,
        offset: 0
      });

    if (!changeResult?.error) {

      withdrawnRows =
        buildWithdrawnParticipantDisplayRows(
          module,
          answers,
          displayRows,
          changeResult.rows || []
        );

    }

  } else {

    withdrawnRows =
      buildWithdrawnParticipantDisplayRows(
        module,
        answers,
        displayRows,
        []
      );

  }

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

${renderWithdrawnParticipantsSection(
  withdrawnRows
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

        const memberId =
          parseInt(
            button.dataset.memberId,
            10
          );

        const guestModuleId =
          parseInt(
            button.dataset.moduleId,
            10
          );

        if (
          !memberId
          || !guestModuleId
        ) {
          return;
        }

        void openGuestWalkInEditModal({
          memberId,
          moduleId: guestModuleId,
          onSaved: async () => {

            if (callbacks?.onParticipantsChanged) {
              callbacks.onParticipantsChanged();
            }

            if (callbacks?.reload) {
              await callbacks.reload();
            }

          }
        });

      });

    });

}

async function openGuestWalkInEditModal(
  options = {}
) {

  const memberId =
    options.memberId;

  const moduleId =
    options.moduleId;

  if (
    !memberId
    || !moduleId
  ) {
    return;
  }

  if (
    typeof ensureEventVorstandModal
      !== 'function'
  ) {
    alert(
      'Walk-in-Bearbeitung ist nicht verfügbar.'
    );
    return;
  }

  const modalId =
    'guest-walkin-edit-modal';

  ensureEventVorstandModal(
    modalId,
    options.title || 'Walk-in Gast bearbeiten',
    'member-feedback-modal__dialog--wide'
  );

  const modal =
    document.getElementById(modalId);

  const body =
    modal?.querySelector(
      '[data-event-vorstand-modal-body]'
    );

  if (!body) {
    return;
  }

  body.innerHTML =
    '<p class="admin-hint">Daten werden geladen …</p>';

  openEventVorstandModal(
    modalId,
    options.title || 'Walk-in Gast bearbeiten'
  );

  const { data: member, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.members
      )
      .select(
        'id,vorname,nachname,email,telefonnummer,rolle'
      )
      .eq('id', memberId)
      .single();

  if (
    error
    || !member
  ) {

    body.innerHTML =
      '<p class="admin-hint admin-hint--error">Gast konnte nicht geladen werden.</p>';

    return;

  }

  const isIncognito =
    typeof isIncognitoGuestMember === 'function'
    && isIncognitoGuestMember(member);

  const emailValue =
    typeof isGuestInternalEmail === 'function'
    && isGuestInternalEmail(member.email)
      ? ''
      : (member.email || '');

  body.innerHTML = `
<form class="feedback-guest-edit-form">

<label class="admin-field">
  Vorname
  <input
    id="guest-walkin-vorname"
    type="text"
    value="${escapeAdminHtml(
      isIncognito
        ? ''
        : (member.vorname || '')
    )}"
    ${isIncognito ? 'disabled' : ''}>
</label>

<label class="admin-field">
  Nachname / Bezeichnung
  <input
    id="guest-walkin-nachname"
    type="text"
    value="${escapeAdminHtml(
      isIncognito
        ? (member.nachname || '')
        : (member.nachname || '')
    )}">
</label>

<label class="admin-field feedback-participant-admin__checkbox">
  <input
    id="guest-walkin-incognito"
    type="checkbox"
    ${isIncognito ? 'checked' : ''}>
  Inkognito (nur für Vorstand sichtbar)
</label>

<label class="admin-field">
  Telefon
  <input
    id="guest-walkin-telefon"
    type="tel"
    value="${escapeAdminHtml(
      member.telefonnummer || ''
    )}">
</label>

<label class="admin-field">
  E-Mail (für späteren Zugang)
  <input
    id="guest-walkin-email"
    type="email"
    value="${escapeAdminHtml(emailValue)}"
    placeholder="optional">
</label>

<p class="admin-hint">
  Derselbe Datensatz wird später bei
  Anmeldung per E-Mail weiterverwendet —
  kein Duplikat.
</p>

<div class="member-feedback-modal__actions">

<button
  type="button"
  class="member-edit-btn member-edit-btn--secondary"
  data-close-event-vorstand-modal="true">

  Abbrechen

</button>

<button
  type="button"
  class="member-edit-btn"
  id="guest-walkin-save">

  Speichern

</button>

</div>

</form>
  `;

  const incognitoInput =
    body.querySelector(
      '#guest-walkin-incognito'
    );

  const vornameInput =
    body.querySelector(
      '#guest-walkin-vorname'
    );

  const nachnameInput =
    body.querySelector(
      '#guest-walkin-nachname'
    );

  incognitoInput
    ?.addEventListener('change', () => {

      const checked =
        incognitoInput.checked === true;

      if (vornameInput) {
        vornameInput.disabled = checked;

        if (checked) {
          vornameInput.value = '';
        }

      }

    });

  body
    .querySelector('#guest-walkin-save')
    ?.addEventListener('click', () => {

      void (async () => {

        const incognito =
          incognitoInput?.checked === true;

        const vorname =
          vornameInput?.value?.trim() || '';

        const nachname =
          nachnameInput?.value?.trim() || '';

        const telefon =
          body
            .querySelector('#guest-walkin-telefon')
            ?.value
            ?.trim()
          || '';

        const email =
          body
            .querySelector('#guest-walkin-email')
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

        const result =
          await adminManageEventParticipant({
            moduleId,
            action: 'update_guest',
            memberId,
            vorname,
            nachname,
            telefon,
            email,
            incognito
          });

        if (result?.error) {

          alert(
            result.error.message
              || 'Speichern fehlgeschlagen.'
          );

          return;

        }

        closeEventVorstandModal(modalId);

        if (
          typeof options.onSaved === 'function'
        ) {
          await options.onSaved();
        }

        if (
          typeof refreshMemberDraftsTabIndicator
            === 'function'
        ) {
          void refreshMemberDraftsTabIndicator();
        }

      })();

    });

}

window.openGuestWalkInEditModal =
  openGuestWalkInEditModal;
