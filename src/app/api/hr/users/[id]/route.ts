import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { removeEmployeeAndDependencies } from '@/lib/auth/azureTenantSync'
import { logAudit } from '@/lib/audit/auditLogger'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await validateToken(req)
    requireRole(token, ['HR'])

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, displayName: true, role: true }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (employee.id === token.userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 403 })
    }

    // Role check: Admin cannot delete other Admins via this route for safety
    if (employee.role === 'HR') {
       return NextResponse.json({ error: 'Cannot delete another Admin' }, { status: 403 })
    }

    await removeEmployeeAndDependencies(id)

    await logAudit('ACCOUNT_DEACTIVATE', token.userId, id, {
      before: { displayName: employee.displayName, role: employee.role },
      after: { DELETED: true },
      params: {}
    }, req)

    return NextResponse.json({ message: 'Employee and all related records removed from system' })
  } catch (err: unknown) {
    console.error('[admin-delete] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
