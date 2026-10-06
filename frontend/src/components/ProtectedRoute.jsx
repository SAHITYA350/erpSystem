import React from 'react'
import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-semibold">Access Denied. You do not have permission to view this page.</p>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
