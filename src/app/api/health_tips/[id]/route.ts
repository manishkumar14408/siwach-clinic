import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
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
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid health tip ID' }, { status: 400 })

  try {
    const tip = await queryOne(
      `SELECT id, tip_text, category, is_active, created_at
       FROM health_tips
       WHERE id = $1`,
      [id]
    )

    if (!tip) return NextResponse.json({ error: 'Health tip not found' }, { status: 404 })
    return NextResponse.json({ data: tip })
  } catch (err) {
    console.error('GET health tip error:', err)
    return NextResponse.json({ error: 'Failed to fetch health tip' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid health tip ID' }, { status: 400 })

  try {
    const body = await req.json()
    const { tip_text, category, is_active } = body

    if (tip_text === undefined && category === undefined && is_active === undefined) {
      return NextResponse.json({ error: 'At least one field is required to update' }, { status: 400 })
    }

    const tip = await queryOne(
      `UPDATE health_tips SET
         tip_text = COALESCE($1, tip_text),
         category = COALESCE($2, category),
         is_active = COALESCE($3, is_active)
       WHERE id = $4
       RETURNING id, tip_text, category, is_active, created_at`,
      [tip_text ?? null, category ?? null, is_active ?? null, id]
    )

    if (!tip) return NextResponse.json({ error: 'Health tip not found' }, { status: 404 })
    return NextResponse.json({ data: tip, message: 'Health tip updated successfully' })
  } catch (err) {
    console.error('PUT health tip error:', err)
    return NextResponse.json({ error: 'Failed to update health tip' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(user.role, 'health_tips:delete')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid health tip ID' }, { status: 400 })

  try {
    const deleted = await queryOne<{ id: number }>('DELETE FROM health_tips WHERE id = $1 RETURNING id', [id])
    if (!deleted) return NextResponse.json({ error: 'Health tip not found' }, { status: 404 })
    return NextResponse.json({ message: 'Health tip deleted successfully' })
  } catch (err) {
    console.error('DELETE health tip error:', err)
    return NextResponse.json({ error: 'Failed to delete health tip' }, { status: 500 })
  }
}
