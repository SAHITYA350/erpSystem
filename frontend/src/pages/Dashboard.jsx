import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function Dashboard() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : {}

  const [stats, setStats] = useState({
    enquiries: 0,
    quotations: 0,
    salesOrders: 0,
    products: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [enqRes, quotRes, soRes, prodRes] = await Promise.all([
          api.get('/enquiries'),
          api.get('/quotations'),
          api.get('/sales-orders'),
          api.get('/products'),
        ])
        setStats({
          enquiries: enqRes.data.data.length,
          quotations: quotRes.data.data.length,
          salesOrders: soRes.data.data.length,
          products: prodRes.data.data.length,
        })
      } catch (err) {
        console.error('Dashboard fetch error:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Total Enquiries', value: stats.enquiries, to: '/enquiries', color: 'border-blue-400' },
    { label: 'Total Quotations', value: stats.quotations, to: '/quotations', color: 'border-yellow-400' },
    { label: 'Sales Orders', value: stats.salesOrders, to: '/sales-orders', color: 'border-green-400' },
    { label: 'Products', value: stats.products, to: '/products', color: 'border-purple-400' },
  ]

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">Welcome, {user.name}</h2>
        <p className="text-sm text-gray-500">Role: {user.role}</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {cards.map((card) => (
            <Link
              key={card.label}
              to={card.to}
              className={`bg-white border-l-4 ${card.color} rounded shadow-sm p-4 hover:shadow-md transition-shadow`}
            >
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="bg-white border rounded shadow-sm p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/enquiries" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
            + New Enquiry
          </Link>
          <Link to="/quotations" className="text-sm bg-yellow-500 text-white px-3 py-1.5 rounded hover:bg-yellow-600">
            + New Quotation
          </Link>
          <Link to="/sales-orders" className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">
            Sales Orders
          </Link>
          {user.role === 'ADMIN' && (
            <Link to="/products" className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700">
              + Add Product
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
