import { useEffect, useState } from 'react'
import api from '../services/api'

const emptyForm = {
  product_code: '', product_name: '', category: '', unit: '', base_price: '', initial_stock: ''
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user.role === 'ADMIN'

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const res = await api.get('/products')
      setProducts(res.data.data)
    } catch {
      setMsg({ text: 'Failed to load products', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function change(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg({ text: '', type: '' })
    try {
      await api.post('/products', {
        ...form,
        base_price: Number(form.base_price),
        initial_stock: Number(form.initial_stock) || 0
      })
      setMsg({ text: 'Product added successfully!', type: 'success' })
      setForm(emptyForm)
      setShowForm(false)
      loadProducts()
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Failed to add product', type: 'error' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500">
            {isAdmin ? 'Manage product master list' : 'View product catalogue'}
          </p>
        </div>
        {/* Only ADMIN can add products */}
        {isAdmin && (
          <button onClick={() => { setShowForm(!showForm); setMsg({ text: '', type: '' }) }}
            className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm">
            {showForm ? 'Cancel' : '+ Add Product'}
          </button>
        )}
      </div>

      {msg.text && (
        <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Add form — Admin only */}
      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 mb-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-700">New Product</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Code *</label>
              <input name="product_code" value={form.product_code} onChange={change}
                placeholder="e.g. MOT-001" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
              <input name="product_name" value={form.product_name} onChange={change}
                placeholder="e.g. Industrial Motor 3-Phase" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
              <input name="category" value={form.category} onChange={change}
                placeholder="e.g. Electrical" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
              <input name="unit" value={form.unit} onChange={change}
                placeholder="e.g. Nos" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base Price (₹) *</label>
              <input name="base_price" type="number" value={form.base_price} onChange={change}
                placeholder="e.g. 18500" min="0" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Initial Stock (qty)</label>
              <input name="initial_stock" type="number" value={form.initial_stock} onChange={change}
                placeholder="e.g. 100" min="0" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" className="bg-gray-900 hover:bg-gray-700 text-white px-5 py-2 rounded text-sm">Add Product</button>
            <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm) }}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded border border-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400">
          No products yet.{isAdmin ? ' Click + Add Product to add one.' : ' Ask Admin to add products.'}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Base Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.product_code}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category}</td>
                  <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-3 text-gray-700">₹{Number(p.base_price).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
