import React, { useEffect, useState } from 'react'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge'

function Quotations() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : {}

  const [quotations, setQuotations] = useState([])
  const [enquiries, setEnquiries] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [selectedEnquiryData, setSelectedEnquiryData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const emptyForm = {
    enquiry_id: '',
    valid_until: '',
    notes: '',
    items: [{ product_id: '', quantity: '', unit_price: '', discount_percent: '0', gst_percent: '18' }]
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [qRes, eRes, pRes] = await Promise.all([
        api.get('/quotations'),
        api.get('/enquiries'),
        api.get('/products'),
      ])
      setQuotations(qRes.data.data)
      setEnquiries(eRes.data.data.filter(e => e.status === 'NEW' || e.status === 'QUOTED'))
      setProducts(pRes.data.data)
    } catch { setError('Failed to load data.') }
    finally { setLoading(false) }
  }

  const handleEnquirySelect = async (enquiryId) => {
    setError('')
    if (!enquiryId) {
      setSelectedEnquiryData(null)
      setForm(prev => ({ ...prev, enquiry_id: '', items: [{ product_id: '', quantity: '', unit_price: '', discount_percent: '0', gst_percent: '18' }] }))
      return
    }

    try {
      const res = await api.get(`/enquiries/${enquiryId}`)
      const enq = res.data.data
      setSelectedEnquiryData(enq)

      if (enq.items && enq.items.length > 0) {
        const loadedItems = enq.items.map(item => ({
          product_id: String(item.product_id),
          quantity: String(item.quantity),
          unit_price: String(item.base_price || ''),
          discount_percent: '0',
          gst_percent: '18',
        }))
        setForm(prev => ({
          ...prev,
          enquiry_id: String(enquiryId),
          items: loadedItems
        }))
      } else {
        setForm(prev => ({ ...prev, enquiry_id: String(enquiryId) }))
      }
    } catch (err) {
      console.error('Failed to load enquiry details:', err)
      setForm(prev => ({ ...prev, enquiry_id: String(enquiryId) }))
    }
  }

  const handleProductChange = (index, productId) => {
    const p = products.find(pr => String(pr.id) === String(productId))
    setForm(prev => {
      const updated = prev.items.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            product_id: String(productId),
            unit_price: p ? String(p.base_price) : item.unit_price
          }
        }
        return item
      })
      return { ...prev, items: updated }
    })
  }

  const handleItemChange = (index, field, value) => {
    setForm(prev => {
      const updated = prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      return { ...prev, items: updated }
    })
  }

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: '', unit_price: '', discount_percent: '0', gst_percent: '18' }]
    }))
  }

  const removeItem = (index) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const calcTotals = (items) => {
    let subtotal = 0, discountTotal = 0, gstTotal = 0
    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unit_price) || 0
      const disc = parseFloat(item.discount_percent) || 0
      const gst = parseFloat(item.gst_percent) || 0
      const lineSubtotal = qty * price
      const lineDiscount = lineSubtotal * (disc / 100)
      const lineAfterDiscount = lineSubtotal - lineDiscount
      const lineGst = lineAfterDiscount * (gst / 100)
      subtotal += lineSubtotal
      discountTotal += lineDiscount
      gstTotal += lineGst
    })
    return { subtotal, discountTotal, gstTotal, grand: subtotal - discountTotal + gstTotal }
  }

  const totals = calcTotals(form.items)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    for (const item of form.items) {
      if (!item.product_id) {
        setError('Please select a product for each item row.')
        return
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        setError('Please provide a valid quantity greater than 0.')
        return
      }
    }

    try {
      await api.post('/quotations', {
        enquiry_id: Number(form.enquiry_id),
        valid_until: form.valid_until || undefined,
        notes: form.notes || undefined,
        items: form.items.map(i => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
          unit_price: parseFloat(i.unit_price) || 0,
          discount_percent: parseFloat(i.discount_percent) || 0,
          gst_percent: parseFloat(i.gst_percent) || 18,
        }))
      })
      setForm(emptyForm)
      setSelectedEnquiryData(null)
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create quotation.')
    }
  }

  const updateStatus = async (id, status) => {
    setError('')
    try {
      await api.patch(`/quotations/${id}/status`, { status })
      fetchAll()
      if (selected?.id === id) {
        const res = await api.get(`/quotations/${id}`)
        setSelected(res.data.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Status update failed.')
    }
  }

  const convertToSO = async (id) => {
    setError('')
    try {
      await api.post(`/quotations/${id}/convert`)
      fetchAll()
      setSelected(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Convert failed.')
    }
  }

  const viewQuotation = async (id) => {
    try {
      const res = await api.get(`/quotations/${id}`)
      setSelected(res.data.data)
      setShowForm(false)
    } catch { setError('Failed to load quotation.') }
  }

  const fmt = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Quotations</h2>
        <button onClick={() => { setShowForm(!showForm); setSelected(null); setSelectedEnquiryData(null); }}
          className="text-sm bg-yellow-500 text-white px-3 py-1.5 rounded hover:bg-yellow-600">
          {showForm ? 'Cancel' : '+ Create Quotation'}
        </button>
      </div>

      {error && <div className="mb-4 bg-red-100 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded shadow-sm p-5 mb-5 space-y-4">
          <h3 className="font-semibold text-gray-700">New Quotation</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Enquiry *</label>
              <select
                value={form.enquiry_id}
                onChange={e => handleEnquirySelect(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
              >
                <option value="">-- Select Enquiry --</option>
                {enquiries.map(e => <option key={e.id} value={String(e.id)}>{e.enquiry_number} — {e.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valid Until</label>
              <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>

          {selectedEnquiryData && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
              <span className="font-semibold">{selectedEnquiryData.enquiry_number}</span> — Customer: <strong>{selectedEnquiryData.company_name}</strong> ({selectedEnquiryData.contact_person})
              <p className="mt-0.5 text-blue-700">Items requested in this enquiry have been pre-filled below. You can adjust prices and discounts as needed.</p>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Items</label>
              <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline">+ Add Custom Item</button>
            </div>
            <table className="w-full text-sm mb-2">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-2 py-1 text-left">Product</th>
                  <th className="px-2 py-1 text-center" style={{ width: '90px' }}>Qty</th>
                  <th className="px-2 py-1 text-center" style={{ width: '130px' }}>Unit Price (₹)</th>
                  <th className="px-2 py-1 text-center" style={{ width: '80px' }}>Disc %</th>
                  <th className="px-2 py-1 text-center" style={{ width: '80px' }}>GST %</th>
                  <th style={{ width: '30px' }}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-2 py-1">
                      <select
                        value={item.product_id}
                        required
                        onChange={e => handleProductChange(index, e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-xs bg-white"
                      >
                        <option value="">-- Select Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={String(p.id)}>
                            {p.product_code} — {p.product_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        required
                        placeholder="Qty"
                        className="w-full border rounded px-2 py-1.5 text-xs text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                        required
                        placeholder="Price"
                        className="w-full border rounded px-2 py-1.5 text-xs text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount_percent}
                        onChange={e => handleItemChange(index, 'discount_percent', e.target.value)}
                        placeholder="0"
                        className="w-full border rounded px-2 py-1.5 text-xs text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.gst_percent}
                        onChange={e => handleItemChange(index, 'gst_percent', e.target.value)}
                        placeholder="18"
                        className="w-full border rounded px-2 py-1.5 text-xs text-center"
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} className="text-red-500 text-xs hover:text-red-700">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 p-3 rounded text-sm space-y-1 text-right">
            <div>Subtotal: <strong>{fmt(totals.subtotal)}</strong></div>
            <div>Discount: <strong>-{fmt(totals.discountTotal)}</strong></div>
            <div>GST: <strong>+{fmt(totals.gstTotal)}</strong></div>
            <div className="text-base font-bold text-gray-900">Grand Total: {fmt(totals.grand)}</div>
          </div>

          <button type="submit" className="bg-yellow-500 text-white text-sm px-4 py-2 rounded hover:bg-yellow-600 font-semibold">
            Save Quotation
          </button>
        </form>
      )}

      {selected && (
        <div className="bg-white border rounded shadow-sm p-5 mb-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-gray-700">{selected.quotation_number}</h3>
              <p className="text-sm text-gray-500">{selected.company_name}</p>
              <StatusBadge status={selected.status} />
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 text-sm">✕ Close</button>
          </div>
          <table className="w-full text-sm mt-3">
            <thead><tr className="bg-gray-50 text-xs text-gray-500">
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Unit Price</th>
              <th className="px-3 py-2">Disc%</th>
              <th className="px-3 py-2">GST%</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr></thead>
            <tbody>
              {selected.items?.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">{item.product_name}</td>
                  <td className="px-3 py-2 text-center">{item.quantity}</td>
                  <td className="px-3 py-2 text-center">{fmt(item.unit_price)}</td>
                  <td className="px-3 py-2 text-center">{item.discount_percent}%</td>
                  <td className="px-3 py-2 text-center">{item.gst_percent}%</td>
                  <td className="px-3 py-2 text-right">{fmt(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right text-sm mt-3 space-y-1">
            <div>Subtotal: {fmt(selected.subtotal_amount)}</div>
            <div>Discount: -{fmt(selected.discount_amount)}</div>
            <div>GST: +{fmt(selected.gst_amount)}</div>
            <div className="font-bold text-base">Grand Total: {fmt(selected.total_amount)}</div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            {selected.status === 'DRAFT' && (
              <button onClick={() => updateStatus(selected.id, 'SENT')}
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">Mark Sent</button>
            )}
            {selected.status === 'SENT' && (
              <>
                <button onClick={() => updateStatus(selected.id, 'ACCEPTED')}
                  className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">Accept</button>
                <button onClick={() => updateStatus(selected.id, 'REJECTED')}
                  className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700">Reject</button>
              </>
            )}
            {selected.status === 'ACCEPTED' && (
              <button onClick={() => convertToSO(selected.id)}
                className="text-sm bg-green-700 text-white px-3 py-1.5 rounded hover:bg-green-800">Convert to Sales Order</button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border rounded shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Quotation</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {quotations.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No quotations found.</td></tr>
            ) : quotations.map(q => (
              <tr key={q.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{q.quotation_number}</td>
                <td className="px-4 py-3">{q.company_name}</td>
                <td className="px-4 py-3 text-right">{fmt(q.total_amount)}</td>
                <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => viewQuotation(q.id)} className="text-blue-600 hover:underline text-xs">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Quotations
