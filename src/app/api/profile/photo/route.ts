import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)

    const formData = await req.formData()
    const file = formData.get('photo')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No photo file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG and PNG images are allowed' },
        { status: 400 }
      )
    }

    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Image must be under 2MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    await prisma.employee.update({
      where: { id: token.userId },
      data: { profilePictureUrl: dataUrl },
    })

    return NextResponse.json({ profilePictureUrl: dataUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'UNAUTHORIZED' || message === 'USER_NOT_SYNCED') {
      return NextResponse.json({ error: 'Unauthorized', code: message }, { status: 401 })
    }
    console.error('[/api/profile/photo] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
