export type InvestorEmailDetail = {
  label: string
  value: string
}

export type PremiumInvestorEmailInput = {
  previewText: string
  eyebrow: string
  title: string
  greetingName: string
  message: string
  statusLabel?: string
  statusValue?: string
  details?: InvestorEmailDetail[]
  actionLabel: string
  actionUrl: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function emailAssetBaseUrl(): string {
  return (
    process.env.EMAIL_ASSET_BASE_URL ??
    'https://spacexinvest.co'
  ).replace(/\/+$/, '')
}

export function buildPremiumInvestorEmail(
  input: PremiumInvestorEmailInput
): {
  html: string
  text: string
} {
  const baseUrl = emailAssetBaseUrl()
  const logoUrl =
    `${baseUrl}/media/spacex-logo-transparent.png`

  const details = input.details ?? []

  const detailsHtml = details
    .map(
      (detail) => `
        <tr>
          <td
            style="
              padding: 12px 0;
              border-bottom: 1px solid #232323;
              color: #c7c7c7 !important;
              -webkit-text-fill-color: #c7c7c7 !important;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 12px;
              line-height: 18px;
              text-transform: uppercase;
              letter-spacing: 1.2px;
              vertical-align: top;
              width: 38%;
            "
          >
            ${escapeHtml(detail.label)}
          </td>

          <td
            style="
              padding: 12px 0;
              border-bottom: 1px solid #232323;
              color: #ffffff !important;
              -webkit-text-fill-color: #ffffff !important;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 14px;
              line-height: 20px;
              text-align: right;
              vertical-align: top;
            "
          >
            ${escapeHtml(detail.value)}
          </td>
        </tr>
      `
    )
    .join('')

  const statusHtml =
    input.statusLabel && input.statusValue
      ? `
        <table
          class="email-status-card"
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          bgcolor="#111111"
          style="
            margin: 24px 0;
            border-collapse: collapse;
            background-color: #111111;
            background-image:
              linear-gradient(#111111, #111111);
            border: 1px solid #2b2b2b;
          "
        >
          <tr>
            <td style="padding: 18px 20px;">
              <div
                style="
                  color: #c7c7c7 !important;
                  -webkit-text-fill-color: #c7c7c7 !important;
                  font-family: Arial, Helvetica, sans-serif;
                  font-size: 10px;
                  line-height: 16px;
                  text-transform: uppercase;
                  letter-spacing: 1.6px;
                "
              >
                ${escapeHtml(input.statusLabel)}
              </div>

              <div
                style="
                  margin-top: 5px;
                  color: #ffffff !important;
                  -webkit-text-fill-color: #ffffff !important;
                  font-family: Arial, Helvetica, sans-serif;
                  font-size: 18px;
                  line-height: 25px;
                  font-weight: 600;
                "
              >
                ${escapeHtml(input.statusValue)}
              </div>
            </td>
          </tr>
        </table>
      `
      : ''

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    >
    <meta
      name="color-scheme"
      content="light only"
    >
    <meta
      name="supported-color-schemes"
      content="light only"
    >
    <style>
      :root {
        color-scheme: light only;
        supported-color-schemes: light only;
      }

      .email-dark-bg {
        background-color: #050505 !important;
        background-image:
          linear-gradient(#050505, #050505) !important;
      }

      .email-dark-card {
        background-color: #0c0c0c !important;
        background-image:
          linear-gradient(#0c0c0c, #0c0c0c) !important;
      }

      .email-status-card {
        background-color: #111111 !important;
        background-image:
          linear-gradient(#111111, #111111) !important;
      }
    </style>
    <title>${escapeHtml(input.title)}</title>
  </head>

  <body
    class="email-dark-bg"
    bgcolor="#050505"
    style="
      margin: 0;
      padding: 0;
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      background-color: #050505;
      background-image:
        linear-gradient(#050505, #050505);
    "
  >
    <div
      style="
        display: none;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        color: transparent;
      "
    >
      ${escapeHtml(input.previewText)}
    </div>

    <table
      class="email-dark-bg"
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      bgcolor="#050505"
      style="
        width: 100%;
        background-color: #050505;
        background-image:
          linear-gradient(#050505, #050505);
        border-collapse: collapse;
      "
    >
      <tr>
        <td
          class="email-dark-bg"
          align="center"
          bgcolor="#050505"
          style="
            padding: 38px 16px;
            background-color: #050505;
            background-image:
              linear-gradient(#050505, #050505);
          "
        >
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              width: 100%;
              max-width: 620px;
              border-collapse: collapse;
            "
          >
            <tr>
              <td style="padding: 0 8px 22px;">
                <img
                  src="${escapeHtml(logoUrl)}"
                  width="185"
                  alt="SpaceX Invest"
                  style="
                    display: block;
                    width: 185px;
                    max-width: 100%;
                    height: auto;
                    border: 0;
                  "
                >
              </td>
            </tr>

            <tr>
              <td
                class="email-dark-card"
                bgcolor="#0c0c0c"
                style="
                  color: #ffffff !important;
                  -webkit-text-fill-color: #ffffff !important;
                  background-color: #0c0c0c;
                  background-image:
                    linear-gradient(#0c0c0c, #0c0c0c);
                  border: 1px solid #242424;
                  padding: 42px 38px;
                "
              >
                <div
                  style="
                    display: inline-block;
                    padding: 7px 10px;
                    border: 1px solid #323232;
                    color: #e8e8e8 !important;
                    -webkit-text-fill-color: #e8e8e8 !important;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 9px;
                    line-height: 12px;
                    letter-spacing: 1.7px;
                    text-transform: uppercase;
                  "
                >
                  Private Investor Network
                </div>

                <div
                  style="
                    margin-top: 24px;
                    color: #c7c7c7 !important;
                    -webkit-text-fill-color: #c7c7c7 !important;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 11px;
                    line-height: 17px;
                    letter-spacing: 1.4px;
                    text-transform: uppercase;
                  "
                >
                  ${escapeHtml(input.eyebrow)}
                </div>

                <h1
                  style="
                    margin: 10px 0 0;
                    color: #ffffff !important;
                    -webkit-text-fill-color: #ffffff !important;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 30px;
                    line-height: 38px;
                    font-weight: 500;
                  "
                >
                  ${escapeHtml(input.title)}
                </h1>

                <p
                  style="
                    margin: 28px 0 0;
                    color: #ffffff !important;
                    -webkit-text-fill-color: #ffffff !important;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 15px;
                    line-height: 24px;
                  "
                >
                  Hello ${escapeHtml(input.greetingName)},
                </p>

                <p
                  style="
                    margin: 14px 0 0;
                    color: #e8e8e8 !important;
                    -webkit-text-fill-color: #e8e8e8 !important;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 15px;
                    line-height: 25px;
                  "
                >
                  ${escapeHtml(input.message)}
                </p>

                ${statusHtml}

                ${
                  details.length
                    ? `
                      <table
                        role="presentation"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        style="
                          margin: 10px 0 28px;
                          width: 100%;
                          border-collapse: collapse;
                        "
                      >
                        ${detailsHtml}
                      </table>
                    `
                    : ''
                }

                <table
                  role="presentation"
                  cellpadding="0"
                  cellspacing="0"
                  style="border-collapse: collapse;"
                >
                  <tr>
                    <td
                      style="
                        background-color: #ffffff;
                        text-align: center;
                      "
                    >
                      <a
                        href="${escapeHtml(input.actionUrl)}"
                        style="
                          display: inline-block;
                          padding: 15px 24px;
                          color: #000000 !important;
                          -webkit-text-fill-color: #000000 !important;
                          font-family: Arial, Helvetica, sans-serif;
                          font-size: 12px;
                          line-height: 16px;
                          font-weight: 700;
                          letter-spacing: 1px;
                          text-decoration: none;
                          text-transform: uppercase;
                        "
                      >
                        ${escapeHtml(input.actionLabel)}
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="
                    margin: 30px 0 0;
                    color: #b8b8b8 !important;
                    -webkit-text-fill-color: #b8b8b8 !important;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 11px;
                    line-height: 18px;
                  "
                >
                  For security, sign in directly through the
                  private investor portal. Never share your password,
                  verification code, or MFA recovery information.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 24px 8px 0;">
                <p
                  style="
                    margin: 0;
                    color: #aaaaaa !important;
                    -webkit-text-fill-color: #aaaaaa !important;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 10px;
                    line-height: 17px;
                  "
                >
                  This notification was generated because activity
                  occurred on your private investor account.
                </p>

                <p
                  style="
                    margin: 7px 0 0;
                    color: #929292 !important;
                    -webkit-text-fill-color: #929292 !important;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 10px;
                    line-height: 17px;
                  "
                >
                  © ${new Date().getUTCFullYear()} SpaceX Invest.
                  Private investor access.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const textDetails = details
    .map((detail) => `${detail.label}: ${detail.value}`)
    .join('\n')

  const text = [
    input.eyebrow,
    '',
    input.title,
    '',
    `Hello ${input.greetingName},`,
    '',
    input.message,
    '',
    input.statusLabel && input.statusValue
      ? `${input.statusLabel}: ${input.statusValue}`
      : '',
    textDetails,
    '',
    `${input.actionLabel}: ${input.actionUrl}`,
    '',
    'For security, never share your password, verification code, or MFA recovery information.'
  ]
    .filter((line) => line !== '')
    .join('\n')

  return {
    html,
    text
  }
}
