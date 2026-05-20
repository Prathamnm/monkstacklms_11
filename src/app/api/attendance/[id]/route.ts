import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    if (token.role !== 'HR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { punchIn, punchOut } = await req.json()
    
    // Calculate hours worked
    let hoursWorked = null
    if (punchIn && punchOut) {
      const inDate = new Date(punchIn)
      const outDate = new Date(punchOut)
      hoursWorked = Number(((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60)).toFixed(2))
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id: params.id },
      data: {
        punchIn: punchIn ? new Date(punchIn) : null,
        punchOut: punchOut ? new Date(punchOut) : null,
        hoursWorked
      }
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    if (token.role !== 'HR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.attendanceRecord.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
