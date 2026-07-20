import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// GET /api/patients/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })

  try {
    const patient = await queryOne('SELECT * FROM patient_master_data WHERE patient_uhid = $1', [id])
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    return NextResponse.json({ data: { patient } })
  } catch (err) {
    console.error('GET patient error:', err)
    return NextResponse.json({ error: 'Failed to fetch patient' }, { status: 500 })
  }
}

// PUT /api/patients/[id] — update patient_master_data
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })

  try {
    const body = await req.json()
    const {
      full_name, age_dob, gender, whatsapp_no, phone_no,
      email, blood_group, address, relation, marital_status, preferred_language,
    } = body

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    const patient = await queryOne(
      `UPDATE patient_master_data SET
        full_name         = $1,
        age_dob           = $2,
        gender            = $3,
        whatsapp_no       = $4,
        phone_no          = $5,
        email             = $6,
        blood_group       = $7,
        address           = $8,
        relation          = $9,
        marital_status    = $10,
        preferred_language = $11
       WHERE patient_uhid = $12
       RETURNING *`,
      [
        full_name.trim(),
        age_dob || null,
        gender || null,
        whatsapp_no || null,
        phone_no || null,
        email || null,
        blood_group || null,
        address || null,
        relation || null,
        marital_status || null,
        preferred_language || null,
        id,
      ]
    )

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    return NextResponse.json({ data: patient, message: 'Patient updated successfully' })
  } catch (err) {
    console.error('PUT patient error:', err)
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 })
  }
}

// PATCH /api/patients/[id] — update feedback_type only
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })

  try {
    const body = await req.json()
    const { feedback_type } = body

    if (feedback_type !== null && feedback_type !== 'GFORM' && feedback_type !== 'GREVIEW') {
      return NextResponse.json({ error: 'Invalid feedback_type' }, { status: 400 })
    }

    const patient = await queryOne(
      `UPDATE patient_master_data SET feedback_type = $1 WHERE patient_uhid = $2 RETURNING patient_uhid, feedback_type`,
      [feedback_type, id]
    )

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    return NextResponse.json({ data: patient, message: 'Feedback type updated' })
  } catch (err) {
    console.error('PATCH patient error:', err)
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 })
  }
}

// DELETE /api/patients/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(user.role, 'patients:delete')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

  const { id: idStr } = await params
  const id = parseInt(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })

  try {
    const result = await queryOne<{ patient_uhid: number }>(
      'DELETE FROM patient_master_data WHERE patient_uhid = $1 RETURNING patient_uhid',
      [id]
    )
    if (!result) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    return NextResponse.json({ message: 'Patient deleted successfully' })
  } catch (err) {
    console.error('DELETE patient error:', err)
    return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 })
  }
}