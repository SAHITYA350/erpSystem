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
    { to: '/inventory', label: 'Inventory' },
    { to: '/dispatches', label: 'Dispatches' },
    { to: '/products', label: 'Products' },
  ]

  return (
    <nav className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between flex-wrap gap-4 shadow">
      <div className="flex items-center gap-6 flex-wrap">
        <Link to="/" className="font-bold text-lg tracking-wide text-white hover:text-yellow-300">
          ERP System
        </Link>
        <div className="flex gap-4 flex-wrap">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm whitespace-nowrap hover:text-yellow-300 transition-colors ${
                location.pathname === link.to ? 'text-yellow-300 font-semibold border-b-2 border-yellow-300 pb-0.5' : 'text-gray-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          to="/profile"
          className="text-sm text-gray-200 hover:text-yellow-300 flex items-center gap-1.5"
        >
          <span>{user.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded font-mono ${user.role === 'ADMIN' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
            {user.role}
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Navbar
