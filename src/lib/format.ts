export function fmtDate(sqlUtc: string): string {
  const d = new Date(`${sqlUtc.replace(' ', 'T')}Z`)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function methodLabel(method: string): string {
  switch (method) {
    case 'cod':
      return 'الدفع عند الاستلام'
    case 'instapay':
      return 'انستا باي'
    case 'vodafone_cash':
      return 'فودافون كاش'
    case 'cash':
      return 'كاش (المحل)'
    default:
      return method
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'قيد المراجعة'
    case 'confirmed':
      return 'مؤكد'
    case 'rejected':
      return 'مرفوض'
    case 'delivered':
      return 'تم التسليم'
    default:
      return status
  }
}

export function orderNumber(id: number): string {
  return `VANS-${String(id).padStart(5, '0')}`
}
