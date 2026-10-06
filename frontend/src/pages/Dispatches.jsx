import { useState, useEffect } from 'react'
import api from '../services/api'

export default function Dispatches() {
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDispatch, setSelectedDispatch] = useState(null)

  useEffect(() => { loadDispatches() }, [])

  async function loadDispatches() {
    try {
      setLoading(true)
      const res = await api.get('/dispatches')
      if (res.data.success) setDispatches(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dispatches')
    } finally {
      setLoading(false)
    }
  }

  async function viewDetails(id) {
    try {
      const res = await api.get(`/dispatches/${id}`)
      if (res.data.success) setSelectedDispatch(res.data.data)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load dispatch details')
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dispatch Records</h1>
        <p className="text-sm text-gray-500">View all completed dispatches and delivery documentation</p>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-100 border border-red-300 text-red-700 rounded text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading dispatches...</div>
      ) : dispatches.length === 0 ? (
        <div className="bg-white rounded border border-gray-200 p-8 text-center text-gray-500">
          No dispatches recorded yet.
          <p className="text-xs mt-1 text-gray-400">Admin can dispatch confirmed orders from the Sales Orders page.</p>
        </div>
      ) : (
        <div className="bg-white rounded border border-gray-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Dispatch #</th>
                <th className="px-4 py-3">Sales Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dispatches.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-blue-600">{d.dispatch_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{d.order_number}</td>
                  <td className="px-4 py-3">{d.company_name}</td>
                  <td className="px-4 py-3 text-gray-500">{d.dispatch_date ? d.dispatch_date.slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3">{d.vehicle_number || '—'}</td>
                  <td className="px-4 py-3">{d.driver_name || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => viewDetails(d.id)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selectedDispatch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold">{selectedDispatch.dispatch_number}</h2>
                <p className="text-xs text-gray-500">Order: {selectedDispatch.order_number}</p>
              </div>
              <button onClick={() => setSelectedDispatch(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded">
              <div>
                <p className="text-gray-500 text-xs mb-1">Customer</p>
                <p className="font-semibold">{selectedDispatch.company_name}</p>
                <p className="text-xs text-gray-600">{selectedDispatch.contact_person} — {selectedDispatch.mobile}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Logistics</p>
                <p><span className="text-gray-500">Vehicle:</span> {selectedDispatch.vehicle_number || 'N/A'}</p>
                <p><span className="text-gray-500">Driver:</span> {selectedDispatch.driver_name || 'N/A'}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Dispatched Items</h3>
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2">Item Code</th>
                      <th className="px-3 py-2">Product Name</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedDispatch.items?.map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-mono">{item.product_code}</td>
                        <td className="px-3 py-2">{item.product_name}</td>
                        <td className="px-3 py-2 text-right font-semibold">{item.quantity}</td>
                        <td className="px-3 py-2 text-gray-500">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedDispatch(null)}
                className="px-4 py-1.5 bg-gray-800 text-white rounded text-sm hover:bg-gray-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
