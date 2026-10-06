import React, { useEffect, useState } from 'react'
import api from '../services/api'

function Profile() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setProfile(res.data.data))
      .catch(() => setError('Failed to load profile.'))
  }, [])

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!profile) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">My Profile</h2>
      <div className="bg-white border rounded shadow-sm p-5 space-y-3">
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold">Name</span>
          <p className="text-gray-800 font-medium">{profile.name}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold">Email</span>
          <p className="text-gray-800">{profile.email}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold">Role</span>
          <p>
            <span className={`text-xs font-bold px-2 py-1 rounded ${profile.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {profile.role}
            </span>
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold">Member Since</span>
          <p className="text-gray-800 text-sm">{new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}

export default Profile
