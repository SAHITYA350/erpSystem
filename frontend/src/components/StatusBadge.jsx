import React from 'react'

const statusColors = {
  // Enquiry
  NEW: 'bg-blue-100 text-blue-800',
  QUOTED: 'bg-yellow-100 text-yellow-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
  // Quotation
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  // Sales Order
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

function StatusBadge({ status }) {
  const color = statusColors[status] || 'bg-gray-100 text-gray-700'
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded ${color}`}>
      {status}
    </span>
  )
}

export default StatusBadge
