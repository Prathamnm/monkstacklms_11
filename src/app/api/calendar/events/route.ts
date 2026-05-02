import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'

export async function GET(req: NextRequest) {
  try {
    // In dev bypass mode, return empty array (no real Outlook)
    if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
      return NextResponse.json([])
    }

    const token = await validateToken(req)

    // Get user's Outlook access token from the header
    const graphToken = req.headers.get('x-graph-token')
    if (!graphToken) {
      return NextResponse.json([])
    }

    const { searchParams } = new URL(req.url)
    const startDateTime = searchParams.get('startDateTime') ?? new Date().toISOString()
    const endDateObj = new Date()
    endDateObj.setDate(endDateObj.getDate() + 30)
    const endDateTime = searchParams.get('endDateTime') ?? endDateObj.toISOString()

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$select=subject,start,end,isAllDay,location&$top=50&$orderby=start/dateTime`,
      {
        headers: {
          Authorization: `Bearer ${graphToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) {
      console.error('[calendar/events] Graph API error:', res.status, await res.text())
      return NextResponse.json([])
    }

    const data = await res.json()
    return NextResponse.json(data.value ?? [])
  } catch (err) {
    console.error('[calendar/events] Error:', err)
    return NextResponse.json([])
  }
}
