function normalizeEnvValue(value) {
  const normalized = value?.trim() ?? ''
  if (!normalized) return ''
  const lowered = normalized.toLowerCase()
  if (lowered === 'undefined' || lowered === 'null') return ''
  return normalized
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim()
  }
  return value
}

function stripAngleBrackets(value) {
  return value.replace(/[<>]/g, '')
}

function decodeSafely(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizePostgresCredentials(value) {
  if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
    return value
  }

  const schemeMatch = value.match(/^(postgres(?:ql)?:\/\/)/)
  if (!schemeMatch) return value
  const scheme = schemeMatch[1]
  const rest = value.slice(scheme.length)
  const atIdx = rest.lastIndexOf('@')
  if (atIdx <= 0) return value

  const authPart = rest.slice(0, atIdx)
  const hostPart = rest.slice(atIdx + 1)
  const colonIdx = authPart.indexOf(':')
  if (colonIdx <= 0) return value

  const rawUser = authPart.slice(0, colonIdx)
  const rawPass = authPart.slice(colonIdx + 1)
  const user = encodeURIComponent(decodeSafely(rawUser))
  const pass = encodeURIComponent(decodeSafely(rawPass))
  return `${scheme}${user}:${pass}@${hostPart}`
}

function ensureAzureSslMode(value) {
  try {
    const parsed = new URL(value)
    const isAzurePostgres = parsed.hostname.endsWith('.postgres.database.azure.com')
    if (isAzurePostgres && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'require')
    }
    return parsed.toString()
  } catch {
    return value
  }
}

function resolveDatasourceUrl(rawUrl) {
  if (!rawUrl) return undefined
  const cleaned = stripAngleBrackets(stripWrappingQuotes(normalizeEnvValue(rawUrl)))
  const credentialSafe = normalizePostgresCredentials(cleaned)
  return ensureAzureSslMode(credentialSafe)
}

const urls = [
  'postgresql://postgres:postgres@localhost:5432/postgres',
  '"postgresql://postgres:postgres@localhost:5432/postgres"',
  'postgresql://moonshine:moonshine@localhost:5433/moonshine_lms',
  'postgresql://user%40server:pass@myserver.postgres.database.azure.com:5432/db'
]

urls.forEach(u => {
  console.log('Original:', u)
  console.log('Resolved:', resolveDatasourceUrl(u))
  console.log('---')
})
