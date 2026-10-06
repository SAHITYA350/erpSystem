import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const statusColor = {
  NEW: 'bg-blue-100 text-blue-700 border border-blue-200',
  QUOTED: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  WON: 'bg-green-100 text-green-700 border border-green-200',
  LOST: 'bg-red-100 text-red-700 border border-red-200'
}

const emptyForm = {
  customerMode: 'existing',
  customer_id: '',
  company_name: '',
  contact_person: '',
  mobile: '',
  email: '',
  city: '',
  required_date: '',
  notes: '',
  items: [{ product_id: '', quantity: '' }]
}

export default function Enquiries() {
  const navigate = useNavigate()

  const [enquiries, setEnquiries] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [form, setForm] = useState(emptyForm)

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isSalesUser = user.role === 'SALES_USER'

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [enqRes, custRes, prodRes] = await Promise.all([
        api.get('/enquiries'),
        api.get('/customers'),
        api.get('/products')
      ])
      setEnquiries(enqRes.data.data)
      setCustomers(custRes.data.data)
      setProducts(prodRes.data.data)
    } catch {
      setMsg({ text: 'Failed to load data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: '' }] }))
  }

  function removeItem(index) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }))
  }

  function updateItem(index, field, value) {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }))
  }

  function resetForm() {
    setForm(emptyForm)
    setShowForm(false)
    setMsg({ text: '', type: '' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg({ text: '', type: '' })

    const payload = {
      required_date: form.required_date || undefined,
      notes: form.notes || undefined,
      items: form.items.map(i => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) }))
    }

    if (form.customerMode === 'existing') {
      if (!form.customer_id) {
        setMsg({ text: 'Please select a customer.', type: 'error' })
        return
      }
      payload.customer_id = Number(form.customer_id)
    } else {
      payload.company_name = form.company_name
      payload.contact_person = form.contact_person
      payload.mobile = form.mobile
      payload.email = form.email || undefined
      payload.city = form.city || undefined
    }

    try {
      await api.post('/enquiries', payload)
      setMsg({ text: 'Enquiry created successfully!', type: 'success' })
      resetForm()
      loadData()
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Failed to create enquiry', type: 'error' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Enquiries</h1>
          <p className="text-sm text-gray-500">
            {isSalesUser
              ? 'Create and manage customer enquiries'
              : 'View all customer enquiries (read-only)'}
          </p>
        </div>
        {isSalesUser && (
          <button
            onClick={() => { setShowForm(!showForm); setMsg({ text: '', type: '' }) }}
            className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            {showForm ? 'Cancel' : '+ New Enquiry'}
          </button>
        )}
      </div>

      {msg.text && (
        <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {msg.text}
        </div>
      )}

      {showForm && isSalesUser && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 mb-6 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700">New Enquiry</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
              <div className="flex gap-3 mb-2">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="customerMode" value="existing"
                    checked={form.customerMode === 'existing'}
                    onChange={() => setForm(f => ({ ...f, customerMode: 'existing', customer_id: '' }))}
                  />
                  Select existing
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="customerMode" value="new"
                    checked={form.customerMode === 'new'}
                    onChange={() => setForm(f => ({ ...f, customerMode: 'new', customer_id: '' }))}
                  />
                  Create new
                </label>
              </div>

              {form.customerMode === 'existing' ? (
                <select value={form.customer_id}
                  onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" required>
                  <option value="">— Select customer —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name} ({c.city || 'N/A'})</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <input required placeholder="Company Name *" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  <input required placeholder="Contact Person *" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  <input required placeholder="Mobile *" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  <input placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Required By Date</label>
                <input type="date" value={form.required_date}
                  onChange={e => setForm(f => ({ ...f, required_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea placeholder="Any special requirements..." value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" rows={3} />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Products Required</span>
              <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Add Product</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" required>
                    <option value="">— Select product —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_code} — {p.product_name} ({p.unit})</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Qty" value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', e.target.value)}
                    className="w-24 border border-gray-300 rounded px-3 py-2 text-sm" min="1" required />
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" className="bg-gray-900 hover:bg-gray-700 text-white px-5 py-2 rounded text-sm font-medium">Create Enquiry</button>
            <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded border border-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Loading enquiries...</div>
      ) : enquiries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400">
          No enquiries yet.{isSalesUser && <> Click <strong>+ New Enquiry</strong> to create one.</>}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Enquiry #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Required By</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created By</th>
                {isSalesUser && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enquiries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{e.enquiry_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{e.company_name}</div>
                    <div className="text-xs text-gray-400">{e.contact_person}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{e.enquiry_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-500">{e.required_date?.slice(0, 10) || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 font-semibold">{e.item_count} items</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusColor[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{e.created_by_name || '—'}</td>
                  {isSalesUser && (
                    <td className="px-4 py-3 text-right">
                      {(e.status === 'NEW' || e.status === 'QUOTED') && (
                        <button
                          onClick={() => navigate(`/quotations?enquiry_id=${e.id}`)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-medium"
                        >
                          + Create Quote
                        </button>
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
