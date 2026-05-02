import { EmailClient } from '@azure/communication-email'

export interface SendMailParams {
  to: string[]
  cc?: string[]
  subject: string
  htmlBody: string
  saveToSentItems?: boolean
}

export async function sendMail(params: SendMailParams): Promise<void> {
  const connectionString = process.env.ACS_CONNECTION_STRING
  const senderAddress   = process.env.ACS_SENDER_ADDRESS
  const isDryRun        = process.env.ACS_DRY_RUN === 'true'
  const debugOverride   = process.env.DEBUG_EMAIL_OVERRIDE?.trim()

  if (!connectionString || connectionString === 'YOUR_ACS_CONNECTION_STRING') {
    console.warn('[acsMailer] ACS not configured. Email not sent:', params.subject)
    return
  }
  if (!senderAddress) {
    console.warn('[acsMailer] ACS_SENDER_ADDRESS not set. Email not sent:', params.subject)
    return
  }

  const toAddresses   = debugOverride ? [debugOverride] : params.to.filter(Boolean)
  const ccAddresses   = debugOverride ? [] : (params.cc ?? []).filter(Boolean)

  if (debugOverride) {
    console.log(`[acsMailer] DEBUG_EMAIL_OVERRIDE active — redirecting to ${debugOverride}`)
  }

  if (isDryRun) {
    console.log('[acsMailer] DRY RUN — would send:', {
      to: toAddresses,
      cc: ccAddresses,
      subject: params.subject,
    })
    return
  }

  try {
    const client = new EmailClient(connectionString)

    const message = {
      senderAddress,
      recipients: {
        to:  toAddresses.map(address => ({ address })),
        cc:  ccAddresses.map(address => ({ address })),
      },
      content: {
        subject:  params.subject,
        html:     params.htmlBody,
      },
    }

    const poller = await client.beginSend(message)
    const result = await poller.pollUntilDone()

    if (result.status !== 'Succeeded') {
      throw new Error(`[acsMailer] Send failed with status: ${result.status}`)
    }
  } catch (error: any) {
    console.error(`[acsMailer] Send failed: ${error.message || error}`)
    throw error // rethrow so callers can .catch(console.error)
  }
}
