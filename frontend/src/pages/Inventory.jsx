import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Inventory() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [newStock, setNewStock] = useState('')
  const [msg, setMsg] = useState({ text: '', type: '' })

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user.role === 'ADMIN'

  function loadInventory() {
    setLoading(true)
    api.get('/inventory')
      .then(res => setInventory(res.data.data))
      .catch(() => setMsg({ text: 'Failed to load inventory', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadInventory() }, [])

  function startEdit(item) {
    setEditingId(item.product_id)
    setNewStock(item.physical_quantity)
    setMsg({ text: '', type: '' })
  }

  function cancelEdit() {
    setEditingId(null)
    setNewStock('')
  }

  async function saveStock(productId) {
    setMsg({ text: '', type: '' })
    try {
      await api.patch('/inventory/stock', {
        product_id: productId,
        physical_quantity: Number(newStock)
      })
      setMsg({ text: 'Stock updated successfully!', type: 'success' })
      setEditingId(null)
      loadInventory()
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Failed to update stock', type: 'error' })
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Inventory</h2>
          <p className="text-xs text-gray-500">
            Available = Physical − Reserved. Physical stock only decreases on dispatch.
          </p>
        </div>
        {/* Show read-only badge for Sales User */}
        {!isAdmin && (
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded border border-gray-200">
            👁 View-Only (Sales User)
          </span>
        )}
      </div>

      {msg.text && (
        <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : (
        <div className="bg-white shadow rounded overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Base Price</th>
                <th className="px-4 py-3 text-right">Physical</th>
                <th className="px-4 py-3 text-right">Reserved</th>
                <th className="px-4 py-3 text-right">Available</th>
                {/* Update Stock column only for Admin */}
                {isAdmin && <th className="px-4 py-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => (
                <tr key={item.product_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{item.product_code}</td>
                  <td className="px-4 py-3 font-medium">{item.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                  <td className="px-4 py-3 text-right">₹{Number(item.base_price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {/* Inline edit for Admin */}
                    {isAdmin && editingId === item.product_id ? (
                      <input type="number" min={item.reserved_quantity} value={newStock}
                        onChange={e => setNewStock(e.target.value)}
                        className="w-20 border rounded px-2 py-1 text-sm text-right" />
                    ) : (
                      item.physical_quantity
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-600">{item.reserved_quantity}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${Number(item.available_quantity) <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.available_quantity}
                  </td>
                  {/* Update Stock action — Admin only */}
                  {isAdmin && (
                    <td className="px-4 py-3 text-center">
                      {editingId === item.product_id ? (
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => saveStock(item.product_id)}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">Save</button>
                          <button onClick={cancelEdit}
                            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(item)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium">Update Stock</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
