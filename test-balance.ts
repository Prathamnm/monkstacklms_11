
import { getLeaveBalance } from './src/lib/leave/balanceService'

async function main() {
  const amitId = 'cmocw475w003axwb8msja2sg2'
  const balance = await getLeaveBalance(amitId)
  console.log('API Result for Amit:', balance)
}

main().catch(console.error)
