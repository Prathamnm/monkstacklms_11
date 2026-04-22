import { Client } from '@microsoft/microsoft-graph-client'

export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken)
    },
  })
}

export async function getAppAccessToken(): Promise<string> {
  const tenantId =
    process.env.AZURE_AD_TENANT_ID?.trim() || process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID?.trim()
  const clientId =
    process.env.AZURE_AD_CLIENT_ID?.trim() || process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID?.trim()
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET?.trim()

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Missing Entra credentials: set AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, and AZURE_AD_CLIENT_SECRET (secret is server-only).'
    )
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to get app access token: ${error}`)
  }

  const data = await res.json()
  return data.access_token
}

export async function getUserGroupMemberships(userAccessToken: string): Promise<string[]> {
  const client = createGraphClient(userAccessToken)
  const groups: string[] = []

  // Use $select to limit fields and $top for pagination
  let response = await client
    .api('/me/memberOf')
    .select('displayName,id')
    .top(100)
    .get()

  const names = (response.value ?? [])
    .map((g: { displayName?: string }) => g.displayName)
    .filter(Boolean) as string[]
  groups.push(...names)

  // Handle pagination if user is in more than 100 groups
  while (response['@odata.nextLink']) {
    response = await client.api(response['@odata.nextLink']).get()
    const more = (response.value ?? [])
      .map((g: { displayName?: string }) => g.displayName)
      .filter(Boolean) as string[]
    groups.push(...more)
  }

  return groups
}

/** App-only: read group IDs and display names for role mapping. Requires User.Read.All (application) + admin consent. */
export async function getUserGroupsByObjectId(entraObjectId: string): Promise<Array<{ id: string; displayName: string }>> {
  const appToken = await getAppAccessToken()
  const client = createGraphClient(appToken)
  const response = await client
    .api(
      `/users/${encodeURIComponent(entraObjectId)}/transitiveMemberOf/microsoft.graph.group`
    )
    .select('id,displayName')
    .get()
  return (response.value ?? []).map((g: { id: string; displayName: string }) => ({
    id: g.id,
    displayName: g.displayName
  }))
}

/**
 * Fetch extended profile fields for a user that are not available in the ID token.
 * Requires User.Read.All (application permission) with admin consent.
 * Returns null for any field not set in Azure.
 */
export async function getUserExtendedProfile(entraObjectId: string): Promise<{
  mobilePhone:       string | null
  employeeHireDate:  string | null  // ISO date string e.g. "2024-01-15T00:00:00Z"
  jobTitle:          string | null
  mail:              string | null
  managerObjectId:   string | null  // entraObjectId of the manager
}> {
  const appToken = await getAppAccessToken()
  const client = createGraphClient(appToken)

  // Fetch user profile fields
  const userRes = await client
    .api(`/users/${encodeURIComponent(entraObjectId)}`)
    .select('mobilePhone,employeeHireDate,jobTitle,mail')
    .get()
    .catch(() => null)

  // Fetch manager (separate endpoint — returns 404 if no manager set)
  const managerRes = await client
    .api(`/users/${encodeURIComponent(entraObjectId)}/manager`)
    .select('id')
    .get()
    .catch(() => null)   // 404 = no manager, not an error

  return {
    mobilePhone:      userRes?.mobilePhone      ?? null,
    employeeHireDate: userRes?.employeeHireDate  ?? null,
    jobTitle:         userRes?.jobTitle          ?? null,
    mail:             userRes?.mail              ?? null,
    managerObjectId:  managerRes?.id             ?? null,
  }
}
