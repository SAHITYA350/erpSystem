import React, { useEffect, useState } from 'react'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge'

function Enquiries() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : {}

  const [enquiries, setEnquiries] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedEnquiry, setSelectedEnquiry] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const emptyForm = {
    customer_id: '',
    company_name: '', contact_person: '', mobile: '', email: '', city: '',
    required_date: '', notes: '',
    items: [{ product_id: '', quantity: '' }]
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [eRes, pRes, cRes] = await Promise.all([
        api.get('/enquiries'),
        api.get('/products'),
        api.get('/customers'),
      ])
      setEnquiries(eRes.data.data)
      setProducts(pRes.data.data)
      setCustomers(cRes.data.data)
    } catch (err) {
      setError('Failed to load enquiries.')
    } finally {
      setLoading(false)
    }
  }

  const handleItemChange = (index, field, value) => {
    const updated = form.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    setForm({ ...form, items: updated })
  }

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { product_id: '', quantity: '' }] })
  }

  const removeItem = (index) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        required_date: form.required_date || undefined,
        notes: form.notes || undefined,
        items: form.items.map(i => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) }))
      }
      if (form.customer_id) {
        payload.customer_id = Number(form.customer_id)
      } else {
        payload.company_name = form.company_name
        payload.contact_person = form.contact_person
        payload.mobile = form.mobile
        payload.email = form.email || undefined
        payload.city = form.city || undefined
      }
      await api.post('/enquiries', payload)
      setForm(emptyForm)
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create enquiry.')
    }
  }

  const viewEnquiry = async (id) => {
    try {
      const res = await api.get(`/enquiries/${id}`)
      setSelectedEnquiry(res.data.data)
    } catch {
      setError('Failed to load enquiry details.')
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Enquiries</h2>
        <button
          onClick={() => { setShowForm(!showForm); setSelectedEnquiry(null) }}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Create Enquiry'}
        </button>
      </div>

      {error && <div className="mb-4 bg-red-100 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded shadow-sm p-5 mb-5 space-y-4">
          <h3 className="font-semibold text-gray-700">New Enquiry</h3>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Customer Selection</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, customer_id: form.customer_id ? '' : (customers[0]?.id || '') })}
                className="text-xs text-blue-600 hover:underline"
              >
                {form.customer_id ? '+ Switch to New Customer Form' : 'Select from Existing Customers'}
              </button>
            </div>
            <select
              value={form.customer_id}
              onChange={e => setForm({ ...form, customer_id: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
            >
              <option value="">-- Create as New Customer below --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.company_name} — {c.contact_person} ({c.city || 'No City'})</option>
              ))}
            </select>
          </div>

          {form.customer_id && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm">{customers.find(c => c.id === Number(form.customer_id))?.company_name}</p>
                <p>Contact: {customers.find(c => c.id === Number(form.customer_id))?.contact_person} | Mobile: {customers.find(c => c.id === Number(form.customer_id))?.mobile} | Email: {customers.find(c => c.id === Number(form.customer_id))?.email || 'N/A'}</p>
              </div>
              <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded">Existing Customer</span>
            </div>
          )}

          {!form.customer_id && (
            <div className="grid grid-cols-2 gap-3">
              {[
                ['company_name', 'Company Name *'],
                ['contact_person', 'Contact Person *'],
                ['mobile', 'Mobile *'],
                ['email', 'Email'],
                ['city', 'City'],
              ].map(([name, label]) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="text"
                    value={form[name]}
                    onChange={e => setForm({ ...form, [name]: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Required Date</label>
              <input type="date" value={form.required_date}
                onChange={e => setForm({ ...form, required_date: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Products</label>
            {form.items.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2 items-center">
                <select
                  value={item.product_id}
                  onChange={e => handleItemChange(index, 'product_id', e.target.value)}
                  required
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">-- Select Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.product_code} — {p.product_name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                  required
                  className="w-20 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="text-red-500 text-sm hover:text-red-700">✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Add Product</button>
          </div>

          <button type="submit" className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700">
            Create Enquiry
          </button>
        </form>
      )}

      {selectedEnquiry && (
        <div className="bg-white border rounded shadow-sm p-5 mb-5">
          <div className="flex justify-between">
            <h3 className="font-semibold text-gray-700">{selectedEnquiry.enquiry_number}</h3>
            <button onClick={() => setSelectedEnquiry(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕ Close</button>
          </div>
          <p className="text-sm text-gray-600 mt-1">{selectedEnquiry.company_name} — {selectedEnquiry.contact_person}</p>
          <p className="text-xs text-gray-400 mt-1">Required: {selectedEnquiry.required_date || 'N/A'} | Notes: {selectedEnquiry.notes || '—'}</p>
          <StatusBadge status={selectedEnquiry.status} />
          <table className="w-full mt-3 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Qty</th>
              </tr>
            </thead>
            <tbody>
              {selectedEnquiry.items?.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">{item.product_code} — {item.product_name}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border rounded shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Number</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No enquiries found.</td></tr>
            ) : enquiries.map(enq => (
              <tr key={enq.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{enq.enquiry_number}</td>
                <td className="px-4 py-3">{enq.company_name}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(enq.enquiry_date).toLocaleDateString()}</td>
                <td className="px-4 py-3"><StatusBadge status={enq.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => viewEnquiry(enq.id)} className="text-blue-600 hover:underline text-xs">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Enquiries
