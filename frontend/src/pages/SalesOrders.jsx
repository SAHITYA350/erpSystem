import React, { useEffect, useState } from 'react'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge'

function SalesOrders() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : {}

  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const emptyDispatch = { product_id: '', quantity: '', vehicle_number: '', driver_name: '' }
  const [dispatchForm, setDispatchForm] = useState(emptyDispatch)
  const [showDispatch, setShowDispatch] = useState(false)

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await api.get('/sales-orders')
      setOrders(res.data.data)
    } catch { setError('Failed to load sales orders.') }
    finally { setLoading(false) }
  }

  const viewOrder = async (id) => {
    setError('')
    try {
      const res = await api.get(`/sales-orders/${id}`)
      setSelected(res.data.data)
      setShowDispatch(false)
      setDispatchForm(emptyDispatch)
    } catch { setError('Failed to load order details.') }
  }

  const confirmOrder = async (id) => {
    setError('')
    try {
      await api.post(`/sales-orders/${id}/confirm`)
      fetchOrders()
      viewOrder(id)
    } catch (err) {
      setError(err.response?.data?.message || 'Confirm failed.')
    }
  }

  const cancelOrder = async (id) => {
    if (!window.confirm('Cancel this order?')) return
    setError('')
    try {
      await api.post(`/sales-orders/${id}/cancel`)
      fetchOrders()
      setSelected(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Cancel failed.')
    }
  }

  const handleDispatch = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/dispatches', {
        sales_order_id: selected.id,
        product_id: Number(dispatchForm.product_id),
        quantity: Number(dispatchForm.quantity),
        vehicle_number: dispatchForm.vehicle_number,
        driver_name: dispatchForm.driver_name || undefined,
      })
      setShowDispatch(false)
      setDispatchForm(emptyDispatch)
      fetchOrders()
      viewOrder(selected.id)
    } catch (err) {
      setError(err.response?.data?.message || 'Dispatch failed.')
    }
  }

  const fmt = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Sales Orders</h2>

      {error && <div className="mb-4 bg-red-100 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

      {selected && (
        <div className="bg-white border rounded shadow-sm p-5 mb-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-gray-700">{selected.order_number}</h3>
              <p className="text-sm text-gray-500">{selected.company_name}</p>
              <div className="mt-1"><StatusBadge status={selected.status} /></div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 text-sm">✕ Close</button>
          </div>

          <table className="w-full text-sm mt-3">
            <thead><tr className="bg-gray-50 text-xs text-gray-500">
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2">Required</th>
              <th className="px-3 py-2">Reserved</th>
              <th className="px-3 py-2">Physical</th>
              <th className="px-3 py-2 text-right">Line Total</th>
            </tr></thead>
            <tbody>
              {selected.items?.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">{item.product_name}</td>
                  <td className="px-3 py-2 text-center">{item.quantity}</td>
                  <td className="px-3 py-2 text-center">{item.reserved_quantity ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{item.physical_quantity ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{fmt(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right text-sm font-bold mt-2">Total: {fmt(selected.total_amount)}</div>

          {user.role === 'ADMIN' && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selected.status === 'PENDING' && (
                <>
                  <button onClick={() => confirmOrder(selected.id)}
                    className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">Confirm Order</button>
                  <button onClick={() => cancelOrder(selected.id)}
                    className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700">Cancel Order</button>
                </>
              )}
              {selected.status === 'CONFIRMED' && (
                <>
                  <button onClick={() => setShowDispatch(!showDispatch)}
                    className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">
                    {showDispatch ? 'Cancel Dispatch' : 'Create Dispatch'}
                  </button>
                  <button onClick={() => cancelOrder(selected.id)}
                    className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700">Cancel Order</button>
                </>
              )}
            </div>
          )}

          {showDispatch && selected.status === 'CONFIRMED' && (
            <form onSubmit={handleDispatch} className="mt-4 border rounded bg-gray-50 p-4 space-y-3">
              <h4 className="font-semibold text-gray-700 text-sm">Dispatch Order</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
                  <select value={dispatchForm.product_id}
                    onChange={e => setDispatchForm({ ...dispatchForm, product_id: e.target.value })}
                    required className="w-full border rounded px-3 py-2 text-sm">
                    <option value="">-- Select Product --</option>
                    {selected.items?.map(item => (
                      <option key={item.product_id} value={item.product_id}>{item.product_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                  <input type="number" min="1" value={dispatchForm.quantity} required
                    onChange={e => setDispatchForm({ ...dispatchForm, quantity: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Number *</label>
                  <input type="text" value={dispatchForm.vehicle_number} required
                    onChange={e => setDispatchForm({ ...dispatchForm, vehicle_number: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm" placeholder="OD02AB1234" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Driver Name</label>
                  <input type="text" value={dispatchForm.driver_name}
                    onChange={e => setDispatchForm({ ...dispatchForm, driver_name: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <button type="submit" className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700">
                Create Dispatch
              </button>
            </form>
          )}

          {selected.dispatches?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Dispatches</h4>
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 text-gray-500">
                  <th className="px-3 py-2 text-left">No.</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Driver</th>
                  <th className="px-3 py-2">Date</th>
                </tr></thead>
                <tbody>
                  {selected.dispatches.map(d => (
                    <tr key={d.id} className="border-t">
                      <td className="px-3 py-2">{d.dispatch_number}</td>
                      <td className="px-3 py-2">{d.product_name}</td>
                      <td className="px-3 py-2 text-center">{d.quantity}</td>
                      <td className="px-3 py-2">{d.vehicle_number}</td>
                      <td className="px-3 py-2">{d.driver_name || '—'}</td>
                      <td className="px-3 py-2">{new Date(d.dispatch_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-white border rounded shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No sales orders found.</td></tr>
            ) : orders.map(o => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{o.order_number}</td>
                <td className="px-4 py-3">{o.company_name}</td>
                <td className="px-4 py-3 text-right">{fmt(o.total_amount)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => viewOrder(o.id)} className="text-blue-600 hover:underline text-xs">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SalesOrders
