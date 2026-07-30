import { formatPrice, type Order, type Settings } from '../../lib/api'
import { fmtDate, methodLabel, orderNumber } from '../../lib/format'

export function ReceiptModal({
  order,
  settings,
  onClose,
}: {
  order: Order
  settings: Settings
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:bg-transparent print:p-0">
      <div className="w-full max-w-[340px] bg-white">
        <div className="receipt-print p-5" dir="rtl">
          <p className="text-center font-medium text-[30px] lowercase" dir="ltr">
            vans<span className="align-super text-[12px]">®</span>
          </p>
          {settings.store_address && (
            <p className="mt-1 text-center font-medium text-[11px] text-black/60">
              {settings.store_address}
            </p>
          )}
          {settings.store_phone && (
            <p className="text-center font-medium text-[11px] text-black/60" dir="ltr">
              {settings.store_phone}
            </p>
          )}
          <div className="my-3 border-t border-dashed border-black/40" />
          <div className="flex justify-between font-medium text-[12px]">
            <span>فاتورة: {orderNumber(order.id)}</span>
            <span dir="ltr">{fmtDate(order.created_at)}</span>
          </div>
          {order.customer_name && (
            <p className="mt-1 font-medium text-[12px]">العميل: {order.customer_name}</p>
          )}
          <div className="my-3 border-t border-dashed border-black/40" />
          <table className="w-full font-medium text-[12px]">
            <thead>
              <tr className="text-right text-black/50">
                <th className="pb-1">الصنف</th>
                <th className="pb-1 text-center">مقاس</th>
                <th className="pb-1 text-center">كمية</th>
                <th className="pb-1 text-left">السعر</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((it) => (
                <tr key={it.id}>
                  <td className="py-1">
                    {it.name}
                    <span className="block text-[10px] text-black/50" dir="ltr">
                      {it.code}
                    </span>
                  </td>
                  <td className="py-1 text-center">{it.size}</td>
                  <td className="py-1 text-center">{it.qty}</td>
                  <td className="py-1 text-left" dir="ltr">
                    {formatPrice(it.unit_price * it.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="my-3 border-t border-dashed border-black/40" />
          <div className="flex justify-between font-medium text-[15px]">
            <span>الإجمالي</span>
            <span dir="ltr">{formatPrice(order.total)}</span>
          </div>
          <p className="mt-1 font-medium text-[12px] text-black/60">
            طريقة الدفع: {methodLabel(order.payment_method)}
          </p>
          <div className="my-3 border-t border-dashed border-black/40" />
          <p className="text-center font-medium text-[12px]">شكراً لتسوقك من VANS ♥</p>
        </div>
        <div className="flex gap-2 border-t border-black/10 p-3 print:hidden" dir="rtl">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-11 flex-1 bg-black font-medium text-[14px] text-white"
          >
            🖨 طباعة الريسيت
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 border border-black px-5 font-medium text-[14px]"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
