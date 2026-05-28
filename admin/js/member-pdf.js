const PDF_ORG_NAME = 'MTB Werdohl';

const PDFMAKE_VERSION = '0.2.20';
const PDFMAKE_BASE =
  `https://cdn.jsdelivr.net/npm/pdfmake@${PDFMAKE_VERSION}/build`;

let pdfMakeReadyPromise = null;

function loadPdfMake() {

  if (
    typeof pdfMake !== 'undefined'
    && pdfMake.createPdf
    && pdfMake.vfs
  ) {
    return Promise.resolve();
  }

  if (pdfMakeReadyPromise) {
    return pdfMakeReadyPromise;
  }

  pdfMakeReadyPromise =
    new Promise((resolve, reject) => {

      const coreScript =
        document.createElement('script');

      coreScript.src =
        `${PDFMAKE_BASE}/pdfmake.min.js`;

      coreScript.onload = () => {

        const fontScript =
          document.createElement('script');

        fontScript.src =
          `${PDFMAKE_BASE}/vfs_fonts.min.js`;

        fontScript.onload = () => {

          if (
            typeof pdfMake !== 'undefined'
            && pdfMake.createPdf
          ) {
            resolve();
            return;
          }

          reject(
            new Error(
              'PDF-Bibliothek unvollständig geladen.'
            )
          );

        };

        fontScript.onerror = () => {
          reject(
            new Error(
              'PDF-Schriftarten konnten nicht geladen werden.'
            )
          );
        };

        document.head.appendChild(fontScript);

      };

      coreScript.onerror = () => {
        reject(
          new Error(
            'PDF-Bibliothek konnte nicht geladen werden.'
          )
        );
      };

      document.head.appendChild(coreScript);

    })
    .catch((error) => {

      pdfMakeReadyPromise = null;

      throw error;

    });

  return pdfMakeReadyPromise;

}

function ensurePdfMakeReady() {

  if (
    typeof pdfMake === 'undefined'
    || !pdfMake.createPdf
  ) {

    throw new Error(
      'PDF-Bibliothek nicht geladen.'
    );

  }

}

function sanitizePdfFilename(value) {

  const cleaned =
    String(value || 'Mitglied')
      .trim()
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

  return cleaned.slice(0, 40) || 'Mitglied';

}

function formatPdfField(value) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return '—';
  }

  return String(value).trim();

}

function formatPdfDate(value) {

  if (!value) {
    return '—';
  }

  const date =
    new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return formatPdfField(value);
  }

  return date.toLocaleDateString('de-DE');

}

function formatPdfYesNo(value) {

  return value === true ? 'Ja' : 'Nein';

}

function formatPdfConsent(
  label,
  granted,
  date
) {

  if (granted === true) {

    const dateText =
      date
        ? ` (am ${formatPdfDate(date)})`
        : '';

    return `${label}: Ja${dateText}`;

  }

  return `${label}: Nein`;

}

function pdfStyles() {

  return {
    org: {
      fontSize: 11,
      color: '#444444'
    },
    title: {
      fontSize: 16,
      bold: true
    },
    meta: {
      fontSize: 9,
      color: '#666666'
    },
    section: {
      fontSize: 11,
      bold: true
    },
    label: {
      bold: true,
      color: '#333333'
    },
    footnote: {
      fontSize: 8,
      color: '#777777',
      margin: [0, 20, 0, 0]
    }
  };

}

function buildMemberPdfDefinition(member) {

  const created =
    new Date().toLocaleDateString('de-DE');

  const fullName =
    [
      member.vorname,
      member.nachname
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Mitglied';

  return {
    pageSize: 'A4',
    pageMargins: [50, 50, 50, 50],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10
    },
    styles: pdfStyles(),
    content: [
      {
        text: PDF_ORG_NAME,
        style: 'org'
      },
      {
        text: 'Mitgliederauszug',
        style: 'title',
        margin: [0, 12, 0, 4]
      },
      {
        text: fullName,
        margin: [0, 0, 0, 4]
      },
      {
        text: `Erstellt am ${created}`,
        style: 'meta',
        margin: [0, 0, 0, 16]
      },
      {
        table: {
          widths: ['32%', '*'],
          body: [
            [
              { text: 'Mitgliedsnummer', style: 'label' },
              formatPdfField(member.mitgliedsnummer)
            ],
            [
              { text: 'Vorname', style: 'label' },
              formatPdfField(member.vorname)
            ],
            [
              { text: 'Nachname', style: 'label' },
              formatPdfField(member.nachname)
            ],
            [
              { text: 'Abteilung', style: 'label' },
              formatPdfField(member.abteilung)
            ],
            [
              { text: 'Straße', style: 'label' },
              formatPdfField(member.strasse)
            ],
            [
              { text: 'Hausnummer', style: 'label' },
              formatPdfField(member.hausnummer)
            ],
            [
              { text: 'PLZ', style: 'label' },
              formatPdfField(member.plz)
            ],
            [
              { text: 'Wohnort', style: 'label' },
              formatPdfField(member.wohnort)
            ],
            [
              { text: 'Geburtsdatum', style: 'label' },
              formatPdfDate(member.geburtsdatum)
            ],
            [
              { text: 'E-Mail', style: 'label' },
              formatPdfField(member.email)
            ],
            [
              { text: 'Telefon', style: 'label' },
              formatPdfField(member.telefonnummer)
            ],
            [
              { text: 'Rolle', style: 'label' },
              formatPdfField(member.rolle || 'Mitglied')
            ]
          ]
        },
        layout: 'lightHorizontalLines'
      },
      {
        text: 'Einwilligungen',
        style: 'section',
        margin: [0, 20, 0, 8]
      },
      {
        ul: [
          formatPdfConsent(
            'Kontakt',
            member.einwilligung_kontakt === true,
            member.kontakt_eingewilligt_am
          ),
          formatPdfConsent(
            'Bilder',
            member.einwilligung_bilder === true,
            member.bilder_eingewilligt_am
          )
        ],
        margin: [0, 0, 0, 0]
      },
      {
        text:
          'Dieser Auszug dient der internen Vereinsverwaltung '
          + 'und enthält personenbezogene Daten.',
        style: 'footnote'
      }
    ]
  };

}

function buildMemberListRow(member) {

  return [
    formatPdfField(member.mitgliedsnummer),
    formatPdfField(member.vorname),
    formatPdfField(member.nachname),
    formatPdfField(member.abteilung),
    formatPdfField(member.strasse),
    formatPdfField(member.hausnummer),
    formatPdfField(member.plz),
    formatPdfField(member.wohnort),
    formatPdfDate(member.geburtsdatum),
    formatPdfField(member.email),
    formatPdfField(member.telefonnummer),
    formatPdfField(member.rolle || 'Mitglied'),
    formatPdfYesNo(member.einwilligung_kontakt === true),
    formatPdfDate(member.kontakt_eingewilligt_am),
    formatPdfYesNo(member.einwilligung_bilder === true),
    formatPdfDate(member.bilder_eingewilligt_am)
  ];

}

function buildMembersListPdfDefinition(members) {

  const created =
    new Date().toLocaleDateString('de-DE');

  const header = [
    { text: 'Nr.', style: 'label' },
    { text: 'Vorname', style: 'label' },
    { text: 'Nachname', style: 'label' },
    { text: 'Abt.', style: 'label' },
    { text: 'Straße', style: 'label' },
    { text: 'Hnr.', style: 'label' },
    { text: 'PLZ', style: 'label' },
    { text: 'Ort', style: 'label' },
    { text: 'Geb.', style: 'label' },
    { text: 'E-Mail', style: 'label' },
    { text: 'Telefon', style: 'label' },
    { text: 'Rolle', style: 'label' },
    { text: 'Einw. Kontakt', style: 'label' },
    { text: 'Kontakt am', style: 'label' },
    { text: 'Einw. Bilder', style: 'label' },
    { text: 'Bilder am', style: 'label' }
  ];

  const body =
    members.map(buildMemberListRow);

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 32, 24, 32],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 6.5
    },
    styles: pdfStyles(),
    content: [
      {
        text: `${PDF_ORG_NAME} — Mitgliederliste`,
        style: 'title',
        fontSize: 13,
        margin: [0, 0, 0, 4]
      },
      {
        text:
          `${members.length} Einträge · Erstellt am ${created}`,
        style: 'meta',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: [
            20,
            38,
            38,
            30,
            42,
            18,
            22,
            34,
            34,
            72,
            46,
            30,
            28,
            34,
            28,
            34
          ],
          body: [header, ...body]
        },
        layout: 'lightHorizontalLines'
      },
      {
        text:
          'Vertraulich — nur für die interne Vereinsverwaltung.',
        style: 'footnote'
      }
    ]
  };

}

function exportMemberPdf(member) {

  return loadPdfMake()
    .then(() => {

      ensurePdfMakeReady();

      const filename =
        'Mitgliederauszug_'
        + sanitizePdfFilename(member.nachname)
        + '_'
        + sanitizePdfFilename(member.vorname)
        + '.pdf';

      pdfMake
        .createPdf(buildMemberPdfDefinition(member))
        .download(filename);

    });

}

function exportMembersListPdf(members) {

  if (!members?.length) {

    return Promise.reject(
      new Error(
        'Keine Mitglieder zum Exportieren.'
      )
    );

  }

  const dateStamp =
    new Date()
      .toISOString()
      .slice(0, 10);

  return loadPdfMake()
    .then(() => {

      ensurePdfMakeReady();

      pdfMake
        .createPdf(buildMembersListPdfDefinition(members))
        .download(`Mitgliederliste_${dateStamp}.pdf`);

    });

}
