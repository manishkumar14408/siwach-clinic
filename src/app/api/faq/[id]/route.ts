import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

function getUser(req: NextRequest) {
  // Support token from either an HTTP-only cookie or an Authorization header
  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = bearer ?? req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid FAQ ID' }, { status: 400 })

  try {
    const faq = await queryOne(
      `SELECT id, question, answer, category, created_at, updated_at
       FROM faqs
       WHERE id = $1`,
      [id]
    )

    if (!faq) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    return NextResponse.json({ data: faq })
  } catch (err) {
    console.error('GET faq error:', err)
    return NextResponse.json({ error: 'Failed to fetch FAQ' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid FAQ ID' }, { status: 400 })

  try {
    const body = await req.json()
    const { question, answer, category } = body

    if (question === undefined && answer === undefined && category === undefined) {
      return NextResponse.json({ error: 'At least one field is required to update' }, { status: 400 })
    }

    const updatedFaq = await queryOne(
      `UPDATE faqs SET
         question = COALESCE($1, question),
         answer = COALESCE($2, answer),
         category = COALESCE($3, category),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, question, answer, category, created_at, updated_at`,
      [question ?? null, answer ?? null, category ?? null, id]
    )

    if (!updatedFaq) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    return NextResponse.json({ data: updatedFaq, message: 'FAQ updated successfully' })
  } catch (err) {
    console.error('PUT faq error:', err)
    return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(user.role, 'faq:delete')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid FAQ ID' }, { status: 400 })

  try {
    const deleted = await queryOne<{ id: number }>('DELETE FROM faqs WHERE id = $1 RETURNING id', [id])
    if (!deleted) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    return NextResponse.json({ message: 'FAQ deleted successfully' })
  } catch (err) {
    console.error('DELETE faq error:', err)
    return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 })
  }
}
