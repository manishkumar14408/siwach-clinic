import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import { UserProvider } from '@/components/UserProvider'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('siwach_auth_token')?.value

  if (!token) redirect('/login')
  const user = verifyToken(token)
  if (!user) redirect('/login')

  return (
    <UserProvider user={user}>
      <div className="flex min-h-screen">
        <Sidebar user={user} />
        <main className="flex-1 min-w-0 pt-14 lg:pt-0">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  )
}
