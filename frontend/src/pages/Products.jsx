import React, { useEffect, useState } from 'react'
import api from '../services/api'

function Products() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : {}
  const isAdmin = user.role === 'ADMIN'

  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [stockEdit, setStockEdit] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const emptyForm = {
    product_code: '', product_name: '', category: '', unit: 'Nos',
    base_price: '', physical_quantity: '', reorder_level: '10'
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/products')
      setProducts(res.data.data)
    } catch { setError('Failed to load products.') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, {
          product_name: form.product_name,
          category: form.category,
          unit: form.unit,
          base_price: parseFloat(form.base_price),
          reorder_level: parseInt(form.reorder_level),
        })
      } else {
        await api.post('/products', {
          product_code: form.product_code,
          product_name: form.product_name,
          category: form.category,
          unit: form.unit,
          base_price: parseFloat(form.base_price),
          physical_quantity: parseInt(form.physical_quantity),
          reorder_level: parseInt(form.reorder_level),
        })
      }
      setForm(emptyForm)
      setShowForm(false)
      setEditProduct(null)
      fetchProducts()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product.')
    }
  }

  const handleStockUpdate = async (e, productId) => {
    e.preventDefault()
    setError('')
    try {
      await api.patch(`/products/${productId}/stock`, {
        quantity: parseInt(stockEdit.quantity),
        operation: stockEdit.operation,
      })
      setStockEdit(null)
      fetchProducts()
    } catch (err) {
      setError(err.response?.data?.message || 'Stock update failed.')
    }
  }

  const startEdit = (p) => {
    setEditProduct(p)
    setForm({
      product_code: p.product_code,
      product_name: p.product_name,
      category: p.category,
      unit: p.unit,
      base_price: p.base_price,
      physical_quantity: p.physical_quantity,
      reorder_level: p.reorder_level,
    })
    setShowForm(true)
    setStockEdit(null)
  }

  const availableQty = (p) => (p.physical_quantity || 0) - (p.reserved_quantity || 0)

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Products</h2>
        {isAdmin && (
          <button onClick={() => { setShowForm(!showForm); setEditProduct(null); setForm(emptyForm) }}
            className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700">
            {showForm ? 'Cancel' : '+ Add Product'}
          </button>
        )}
      </div>

      {error && <div className="mb-4 bg-red-100 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white border rounded shadow-sm p-5 mb-5 space-y-4">
          <h3 className="font-semibold text-gray-700">{editProduct ? 'Edit Product' : 'Create Product'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {!editProduct && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Code *</label>
                <input type="text" value={form.product_code} required
                  onChange={e => setForm({ ...form, product_code: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="P007" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
              <input type="text" value={form.product_name} required
                onChange={e => setForm({ ...form, product_name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <input type="text" value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="Electrical" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm">
                <option>Nos</option>
                <option>Kg</option>
                <option>Mtr</option>
                <option>Ltr</option>
                <option>Set</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base Price *</label>
              <input type="number" min="0" step="0.01" value={form.base_price} required
                onChange={e => setForm({ ...form, base_price: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            {!editProduct && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Opening Stock *</label>
                <input type="number" min="0" value={form.physical_quantity} required
                  onChange={e => setForm({ ...form, physical_quantity: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reorder Level</label>
              <input type="number" min="0" value={form.reorder_level}
                onChange={e => setForm({ ...form, reorder_level: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="bg-purple-600 text-white text-sm px-4 py-2 rounded hover:bg-purple-700">
            {editProduct ? 'Update Product' : 'Add Product'}
          </button>
        </form>
      )}

      {stockEdit && isAdmin && (
        <form onSubmit={(e) => handleStockUpdate(e, stockEdit.id)}
          className="bg-white border rounded shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Update Stock: {stockEdit.product_name}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Operation</label>
            <select value={stockEdit.operation}
              onChange={e => setStockEdit({ ...stockEdit, operation: e.target.value })}
              className="border rounded px-3 py-2 text-sm">
              <option value="ADD">Add Stock</option>
              <option value="REMOVE">Remove Stock</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
            <input type="number" min="1" value={stockEdit.quantity} required
              onChange={e => setStockEdit({ ...stockEdit, quantity: e.target.value })}
              className="border rounded px-3 py-2 text-sm w-28" />
          </div>
          <button type="submit" className="bg-orange-500 text-white text-sm px-3 py-2 rounded hover:bg-orange-600">Update</button>
          <button type="button" onClick={() => setStockEdit(null)} className="text-sm text-gray-500 hover:underline">Cancel</button>
        </form>
      )}

      <div className="bg-white border rounded shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Physical</th>
              <th className="px-4 py-3 text-center">Reserved</th>
              <th className="px-4 py-3 text-center">Available</th>
              {isAdmin && <th className="px-4 py-3 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-6 text-center text-gray-400">No products found.</td></tr>
            ) : products.map(p => (
              <tr key={p.id} className={`border-t hover:bg-gray-50 ${availableQty(p) <= p.reorder_level ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs">{p.product_code}</td>
                <td className="px-4 py-3 font-medium">{p.product_name}</td>
                <td className="px-4 py-3 text-gray-500">{p.category || '—'}</td>
                <td className="px-4 py-3 text-right">₹{parseFloat(p.base_price).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-center">{p.physical_quantity}</td>
                <td className="px-4 py-3 text-center text-yellow-600">{p.reserved_quantity}</td>
                <td className={`px-4 py-3 text-center font-semibold ${availableQty(p) <= p.reorder_level ? 'text-red-600' : 'text-green-700'}`}>
                  {availableQty(p)}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => startEdit(p)}
                      className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => { setStockEdit({ ...p, quantity: '', operation: 'ADD' }); setShowForm(false) }}
                      className="text-xs text-orange-600 hover:underline">Stock</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">* Rows highlighted in red are below reorder level.</p>
    </div>
  )
}

export default Products
