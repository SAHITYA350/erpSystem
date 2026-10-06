import { useEffect, useState } from 'react'
import api from '../services/api'

export default function SalesOrders() {
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [dispatchForm, setDispatchForm] = useState({ vehicle_number: '', driver_name: '' })
  const [showDispatch, setShowDispatch] = useState(false)

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user.role === 'ADMIN'

  async function loadOrders() {
    setLoading(true)
    try {
      const res = await api.get('/sales-orders')
      setOrders(res.data.data)
    } catch {
      setMsg('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  async function loadDetail(id) {
    try {
      const res = await api.get(`/sales-orders/${id}`)
      setDetail(res.data.data)
      setSelected(id)
      setShowDispatch(false)
      setMsg('')
      // Keep table list synced with database
      const listRes = await api.get('/sales-orders')
      setOrders(listRes.data.data)
    } catch {
      setMsg('Failed to load order detail')
    }
  }

  useEffect(() => { loadOrders() }, [])

  async function confirmOrder(id) {
    setMsg('')
    try {
      await api.post(`/sales-orders/${id}/confirm`)
      setMsg('✅ Order confirmed and inventory reserved!')
      loadOrders()
      loadDetail(id)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to confirm order')
    }
  }

  async function dispatchOrder(id) {
    setMsg('')
    if (!dispatchForm.vehicle_number.trim()) {
      setMsg('Vehicle number is required.')
      return
    }
    try {
      await api.post(`/sales-orders/${id}/dispatch`, dispatchForm)
      setMsg('🚚 Order dispatched! Stock updated.')
      setShowDispatch(false)
      setDispatchForm({ vehicle_number: '', driver_name: '' })
      loadOrders()
      loadDetail(id)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to dispatch order')
    }
  }

  const statusColor = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    DISPATCHED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Sales Orders</h2>
        <p className="text-xs text-gray-500">
          {isAdmin
            ? 'Confirm orders to reserve inventory, then dispatch to update stock'
            : 'View your sales orders — Admin will confirm and dispatch'}
        </p>
      </div>

      {msg && (
        <div className={`mb-4 text-sm px-4 py-2 rounded border ${msg.startsWith('✅') || msg.startsWith('🚚')
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg}
        </div>
      )}

      <div className="flex gap-4">
        {/* Order list */}
        <div className="w-1/2">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : orders.length === 0 ? (
            <div className="bg-white p-8 rounded border border-gray-200 text-center text-gray-500 text-sm shadow-sm">
              <p className="font-medium text-gray-700 mb-1">No sales orders found</p>
              <p className="text-xs text-gray-400">
                {isAdmin
                  ? 'Waiting for Sales Users to convert accepted quotations into Sales Orders.'
                  : 'Go to Quotations → Accept a quote → Click "Convert to Sales Order".'}
              </p>
            </div>
          ) : (
            <div className="bg-white shadow rounded overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left text-gray-600">
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} onClick={() => loadDetail(o.id)}
                      className={`border-t cursor-pointer hover:bg-gray-50 ${selected === o.id ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-3 font-mono text-blue-700">{o.order_number}</td>
                      <td className="px-4 py-3">{o.company_name}</td>
                      <td className="px-4 py-3 font-medium">₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[o.status]}`}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order detail panel */}
        {detail && (
          <div className="w-1/2 bg-white border rounded p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">{detail.order_number}</h3>
                <p className="text-sm text-gray-500">{detail.company_name} | {detail.contact_person}</p>
                <p className="text-xs text-gray-400">Quotation: {detail.quotation_number}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[detail.status]}`}>{detail.status}</span>
            </div>

            {/* Items with inventory columns */}
            <table className="w-full text-xs border-collapse mb-4">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Ordered</th>
                  <th className="px-3 py-2 text-right">Physical</th>
                  <th className="px-3 py-2 text-right">Reserved</th>
                  <th className="px-3 py-2 text-right">Available</th>
                </tr>
              </thead>
              <tbody>
                {detail.items?.map(item => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-gray-400">{item.product_code}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{item.physical_quantity ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-yellow-600">{item.reserved_quantity ?? '—'}</td>
                    <td className={`px-3 py-2 text-right font-medium ${item.available_quantity < item.quantity ? 'text-red-600' : 'text-green-600'}`}>
                      {item.available_quantity ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right text-sm font-semibold mb-4 text-gray-800">
              Total: ₹{Number(detail.total_amount).toLocaleString('en-IN')}
            </div>

            {/* ── ADMIN: action buttons ── */}
            {isAdmin ? (
              <div className="space-y-3">
                {detail.status === 'PENDING' && (
                  <button onClick={() => confirmOrder(detail.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded font-medium">
                    ✓ Confirm & Reserve Inventory
                  </button>
                )}

                {detail.status === 'CONFIRMED' && !showDispatch && (
                  <button onClick={() => setShowDispatch(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-medium">
                    🚚 Dispatch Order
                  </button>
                )}

                {detail.status === 'CONFIRMED' && showDispatch && (
                  <div className="space-y-2 border border-green-200 bg-green-50 p-3 rounded">
                    <p className="text-xs font-semibold text-green-800 mb-1">Dispatch Details</p>
                    <input placeholder="Vehicle Number *" value={dispatchForm.vehicle_number}
                      onChange={e => setDispatchForm({ ...dispatchForm, vehicle_number: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm" />
                    <input placeholder="Driver Name (optional)" value={dispatchForm.driver_name}
                      onChange={e => setDispatchForm({ ...dispatchForm, driver_name: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => dispatchOrder(detail.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded">
                        Confirm Dispatch
                      </button>
                      <button onClick={() => { setShowDispatch(false); setDispatchForm({ vehicle_number: '', driver_name: '' }) }}
                        className="bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {detail.status === 'DISPATCHED' && (
                  <div className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded border border-green-200">
                    ✅ Dispatched — Vehicle: {detail.vehicle_number || 'N/A'} | Driver: {detail.driver_name || 'N/A'}
                  </div>
                )}
              </div>
            ) : (
              /* ── SALES_USER: status info only ── */
              <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 p-3 rounded space-y-1">
                {detail.status === 'PENDING' && <p>⏳ <strong>PENDING</strong> — Awaiting Admin confirmation &amp; inventory reservation.</p>}
                {detail.status === 'CONFIRMED' && <p>📦 <strong>CONFIRMED</strong> — Inventory reserved. Awaiting Admin dispatch.</p>}
                {detail.status === 'DISPATCHED' && <p>🚚 <strong>DISPATCHED</strong> — Goods shipped. Check Dispatches page for details.</p>}
                {detail.status === 'CANCELLED' && <p>❌ <strong>CANCELLED</strong> — This order has been cancelled.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
