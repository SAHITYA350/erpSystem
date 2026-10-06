import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Quotations() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [quotations, setQuotations] = useState([])
  const [enquiries, setEnquiries] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    customer_id: '',
    enquiry_id: '',
    valid_until: '',
    items: [{ product_id: '', quantity: '', unit_price: '', discount_percent: '0', gst_percent: '18' }]
  })

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isSalesUser = user.role === 'SALES_USER'

  async function loadData() {
    setLoading(true)
    try {
      const [qRes, eRes, cRes, pRes] = await Promise.all([
        api.get('/quotations'),
        api.get('/enquiries'),
        api.get('/customers'),
        api.get('/products')
      ])
      setQuotations(qRes.data.data)
      setEnquiries(eRes.data.data)
      setCustomers(cRes.data.data)
      setProducts(pRes.data.data)

      // Handle query param ?enquiry_id=...
      const paramEnquiryId = searchParams.get('enquiry_id')
      if (paramEnquiryId) {
        setShowForm(true)
        handleEnquirySelect(paramEnquiryId, eRes.data.data)
      }
    } catch {
      setMsg('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function handleEnquirySelect(enquiryId, enquiriesList = enquiries) {
    if (!enquiryId) {
      setForm(f => ({ ...f, enquiry_id: '' }))
      return
    }

    const selectedEnquiry = enquiriesList.find(e => Number(e.id) === Number(enquiryId))
    const customerId = selectedEnquiry ? String(selectedEnquiry.customer_id) : form.customer_id

    try {
      const res = await api.get(`/enquiries/${enquiryId}`)
      if (res.data.success && res.data.data.items?.length > 0) {
        const enquiryItems = res.data.data.items.map(item => ({
          product_id: String(item.product_id),
          quantity: String(item.quantity),
          unit_price: String(item.base_price || 0),
          discount_percent: '0',
          gst_percent: '18'
        }))
        setForm(f => ({
          ...f,
          enquiry_id: String(enquiryId),
          customer_id: customerId,
          items: enquiryItems
        }))
      } else {
        setForm(f => ({
          ...f,
          enquiry_id: String(enquiryId),
          customer_id: customerId
        }))
      }
    } catch (err) {
      console.error('Failed to load enquiry items:', err)
      setForm(f => ({
        ...f,
        enquiry_id: String(enquiryId),
        customer_id: customerId
      }))
    }
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: '', unit_price: '', discount_percent: '0', gst_percent: '18' }] }))
  }

  function updateItem(index, field, value) {
    const items = form.items.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      if (field === 'product_id' && value) {
        const prod = products.find(p => String(p.id) === String(value))
        if (prod && (!item.unit_price || Number(item.unit_price) === 0)) {
          updated.unit_price = String(prod.base_price)
        }
      }
      return updated
    })
    setForm(f => ({ ...f, items }))
  }

  function removeItem(index) {
    if (form.items.length === 1) return
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setMsg('')
    if (!form.customer_id) {
      setMsg('Please select a customer.')
      return
    }
    try {
      await api.post('/quotations', {
        customer_id: Number(form.customer_id),
        enquiry_id: form.enquiry_id ? Number(form.enquiry_id) : undefined,
        valid_until: form.valid_until || undefined,
        items: form.items.map(i => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          discount_percent: Number(i.discount_percent || 0),
          gst_percent: Number(i.gst_percent || 18)
        }))
      })
      setMsg('✅ Quotation created as DRAFT')
      setShowForm(false)
      setForm({ customer_id: '', enquiry_id: '', valid_until: '', items: [{ product_id: '', quantity: '', unit_price: '', discount_percent: '0', gst_percent: '18' }] })
      loadData()
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to create quotation')
    }
  }

  async function updateStatus(id, status) {
    setMsg('')
    try {
      await api.patch(`/quotations/${id}/status`, { status })
      setMsg(`✅ Status updated to ${status}`)
      loadData()
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to update status')
    }
  }

  async function convert(id) {
    setMsg('')
    try {
      const res = await api.post(`/quotations/${id}/convert`)
      setMsg('🎉 Quotation converted to Sales Order!')
      loadData()
      // Navigate to Sales Orders tab
      setTimeout(() => navigate('/sales-orders'), 1200)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to convert')
    }
  }

  const statusColor = {
    DRAFT: 'bg-gray-100 text-gray-600 border border-gray-200',
    SENT: 'bg-blue-100 text-blue-700 border border-blue-200',
    ACCEPTED: 'bg-green-100 text-green-700 border border-green-200',
    REJECTED: 'bg-red-100 text-red-700 border border-red-200'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Quotations</h2>
          <p className="text-xs text-gray-500">
            {isSalesUser
              ? 'Create quotations, send to customer, and convert accepted quotes to Sales Orders'
              : 'Review customer quotations — confirm or dispatch from Sales Orders'}
          </p>
        </div>
        {isSalesUser && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
            {showForm ? 'Cancel' : '+ New Quotation'}
          </button>
        )}
      </div>

      {msg && (
        <div className={`mb-4 text-sm px-4 py-2 rounded border ${msg.includes('Failed') || msg.includes('Error')
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
          {msg}
        </div>
      )}

      {/* Create form — SALES_USER only */}
      {showForm && isSalesUser && (
        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-5 mb-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700">New Quotation</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Linked Enquiry (Optional)</label>
              <select value={form.enquiry_id} onChange={e => handleEnquirySelect(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-blue-50/50">
                <option value="">None (Standalone Quotation)</option>
                {enquiries.map(e => (
                  <option key={e.id} value={e.id}>{e.enquiry_number} — {e.company_name} ({e.status})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
              <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" required>
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name} ({c.city || 'N/A'})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valid Until</label>
              <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Line Items <span className="text-xs text-gray-400 font-normal">(Prices auto-populated from product catalog)</span></span>
              <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Add Item</button>
            </div>
            <div className="grid grid-cols-6 gap-2 text-xs text-gray-500 mb-1 px-1 font-medium">
              <span className="col-span-2">Product</span><span>Qty</span><span>Unit Price (₹)</span><span>Disc %</span><span>GST %</span>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 mb-2 items-center">
                <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}
                  className="col-span-2 border rounded px-2 py-1.5 text-sm" required>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.product_code} — {p.product_name}</option>)}
                </select>
                <input type="number" min="1" placeholder="Qty" value={item.quantity}
                  onChange={e => updateItem(i, 'quantity', e.target.value)} className="border rounded px-2 py-1.5 text-sm" required />
                <input type="number" min="0" placeholder="Price" value={item.unit_price}
                  onChange={e => updateItem(i, 'unit_price', e.target.value)} className="border rounded px-2 py-1.5 text-sm" required />
                <input type="number" min="0" max="100" placeholder="0" value={item.discount_percent}
                  onChange={e => updateItem(i, 'discount_percent', e.target.value)} className="border rounded px-2 py-1.5 text-sm" />
                <div className="flex gap-1 items-center">
                  <input type="number" min="0" placeholder="18" value={item.gst_percent}
                    onChange={e => updateItem(i, 'gst_percent', e.target.value)} className="border rounded px-2 py-1.5 text-sm w-full" />
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-sm font-medium">
              Create Quotation (DRAFT)
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 border rounded px-4 py-2 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
      ) : quotations.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400">
          No quotations yet.{isSalesUser && ' Click + New Quotation to create one.'}
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                <th className="px-4 py-3">Quotation #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Enquiry</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{q.quotation_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{q.company_name}</td>
                  <td className="px-4 py-3 text-gray-500">{q.enquiry_number || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">₹{Number(q.total_amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusColor[q.status]}`}>{q.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap items-center">
                      {isSalesUser ? (
                        <>
                          {q.status === 'DRAFT' && (
                            <button onClick={() => updateStatus(q.id, 'SENT')}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1 rounded">
                              Send to Customer
                            </button>
                          )}
                          {q.status === 'SENT' && (
                            <>
                              <button onClick={() => updateStatus(q.id, 'ACCEPTED')}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1 rounded"
                                title="Record that the customer approved this quotation via PO or Email">
                                Mark Accepted (Customer Approved)
                              </button>
                              <button onClick={() => updateStatus(q.id, 'REJECTED')}
                                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-medium px-2.5 py-1 rounded"
                                title="Record that the customer rejected this quotation">
                                Mark Rejected
                              </button>
                            </>
                          )}
                          {q.status === 'ACCEPTED' && !q.order_number && (
                            <button onClick={() => convert(q.id)}
                              className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1 rounded shadow-sm">
                              ⚡ Convert to Sales Order
                            </button>
                          )}
                          {q.order_number && (
                            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded">
                              ✓ Sales Order: {q.order_number}
                            </span>
                          )}
                          {q.status === 'REJECTED' && (
                            <span className="text-xs text-red-400 italic">Rejected</span>
                          )}
                        </>
                      ) : (
                        <>
                          {q.order_number ? (
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                              Sales Order: {q.order_number}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Quotation in progress ({q.status})</span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
