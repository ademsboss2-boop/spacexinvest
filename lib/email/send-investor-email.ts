export type SendInvestorEmailInput = {
  to: string
  subject: string
  html: string
  text: string
  idempotencyKey: string
}

type ResendResponse = {
  id?: string
}

export async function sendInvestorEmail(
  input: SendInvestorEmailInput
): Promise<{
  id: string | null
}> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.INVESTOR_EMAIL_FROM

  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not configured.'
    )
  }

  if (!from) {
    throw new Error(
      'INVESTOR_EMAIL_FROM is not configured.'
    )
  }

  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key':
          input.idempotencyKey.slice(0, 256)
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text
      })
    }
  )

  let responseBody: ResendResponse | null = null

  try {
    responseBody =
      (await response.json()) as ResendResponse
  } catch {
    responseBody = null
  }

  if (!response.ok) {
    throw new Error(
      `Email provider request failed with status ${response.status}.`
    )
  }

  return {
    id: responseBody?.id ?? null
  }
}
