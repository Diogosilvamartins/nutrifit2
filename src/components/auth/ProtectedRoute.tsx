import { ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Props {
  children: ReactNode
  roles?: Array<'admin' | 'manager'>
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, loading, profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth')
        return
      }
      if (roles && roles.length > 0) {
        const hasRole = roles.includes(profile?.role as any)
        if (!hasRole) {
          navigate('/')
        }
      }
    }
  }, [user, loading, roles, profile, navigate])

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <LoadingSpinner />
      </div>
    )
  }

  return <>{children}</>
}
