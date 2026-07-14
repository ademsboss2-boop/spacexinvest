export type InvestorNotificationEvent =
  | 'application_status'
  | 'funding_review'
  | 'distribution_recorded'

export async function requestInvestorNotification(
  event: InvestorNotificationEvent,
  recordId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      '/api/investor-notifications',
      {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event,
          recordId
        })
      }
    )

    return response.ok
  } catch {
    return false
  }
}
