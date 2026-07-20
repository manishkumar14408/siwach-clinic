import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })

  try {
    const lead = await queryOne(
      `SELECT l.lead_id, l.patient_id, l.start_day, l.end_day, l.appointment_time,
              l.concern, l.booked_against, l.hot_lead, l.forwarded_to, l.forwarded_time,
              l.summary, l.status, l.last_reengaged_at, l.reengagement_count,
              l.manually_added, l.created_at, l.updated_at,
              p.full_name AS patient_name, p.whatsapp_no AS patient_phone
       FROM patient_leads l
       LEFT JOIN patient_master_data p ON p.patient_uhid = l.patient_id::integer
       WHERE l.lead_id = $1`,
      [id]
    )

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    return NextResponse.json({ data: lead })
  } catch (err) {
    console.error('GET lead error:', err)
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })

  try {
    const body = await req.json()
    const {
      start_day, end_day, appointment_time, concern,
      booked_against, hot_lead, manually_added,
    } = body

    const updatedLead = await queryOne(
      `UPDATE patient_leads SET
         start_day        = COALESCE($1::date, start_day),
         end_day          = COALESCE($2::date, end_day),
         appointment_time = COALESCE($3::timestamp, appointment_time),
         concern          = COALESCE($4, concern),
         booked_against   = COALESCE($5, booked_against),
         hot_lead         = COALESCE($6, hot_lead),
         manually_added   = COALESCE($7, manually_added),
         updated_at       = NOW()
       WHERE lead_id = $8
       RETURNING *`,
      [
        start_day ?? null,
        end_day ?? null,
        appointment_time ?? null,
        concern ?? null,
        booked_against ?? null,
        hot_lead ?? null,
        manually_added ?? null,
        id,
      ]
    )

    if (!updatedLead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    return NextResponse.json({ data: updatedLead, message: 'Lead updated successfully' })
  } catch (err) {
    console.error('PUT lead error:', err)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(user.role, 'leads:delete')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })

  try {
    const deleted = await queryOne<{ lead_id: number }>(
      'DELETE FROM patient_leads WHERE lead_id = $1 RETURNING lead_id',
      [id]
    )

    if (!deleted) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    return NextResponse.json({ message: 'Lead deleted successfully' })
  } catch (err) {
    console.error('DELETE lead error:', err)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}