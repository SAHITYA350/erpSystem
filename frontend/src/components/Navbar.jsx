import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) return null

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/enquiries', label: 'Enquiries' },
    { to: '/quotations', label: 'Quotations' },
    { to: '/sales-orders', label: 'Sales Orders' },
    { to: '/products', label: 'Products' },
  ]

  return (
    <nav className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg tracking-wide">ERP System</span>
        <div className="flex gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm hover:text-yellow-300 transition-colors ${
                location.pathname === link.to ? 'text-yellow-300 font-semibold' : 'text-gray-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          to="/profile"
          className="text-sm text-gray-300 hover:text-yellow-300"
        >
          {user.name} <span className="text-xs bg-gray-600 px-2 py-0.5 rounded ml-1">{user.role}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Navbar
