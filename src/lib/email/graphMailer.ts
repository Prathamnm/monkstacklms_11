import { getAppAccessToken } from '@/lib/auth/graphClient'

interface SendMailParams {
  to: string[]
  cc?: string[]
  subject: string
  htmlBody: string
  saveToSentItems?: boolean
}

export async function sendMail(params: SendMailParams): Promise<void> {
  const senderEmail = process.env.GRAPH_SENDER_EMAIL!
  const accessToken = await getAppAccessToken()

  const message = {
    subject: params.subject,
    body: {
      contentType: 'HTML',
      content: params.htmlBody,
    },
    toRecipients: params.to.map((email) => ({
      emailAddress: { address: email },
    })),
    ccRecipients: (params.cc ?? []).map((email) => ({
      emailAddress: { address: email },
    })),
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        saveToSentItems: params.saveToSentItems ?? false,
      }),
    }
  )

  if (!res.ok && res.status !== 202) {
    const error = await res.text()
    throw new Error(`Graph sendMail failed: ${error}`)
  }
}
