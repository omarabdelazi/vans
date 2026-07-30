import { useEffect, useState } from 'react'
import { api, type Message } from '../../lib/api'
import { fmtDate } from '../../lib/format'

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([])

  const load = () =>
    api<Message[]>('/admin/messages')
      .then(setMessages)
      .catch(() => {})

  useEffect(() => {
    load()
  }, [])

  const markRead = async (m: Message) => {
    await api(`/admin/messages/${m.id}/read`, { method: 'PUT' }).catch(() => {})
    load()
  }

  const remove = async (m: Message) => {
    if (!confirm('حذف الرسالة؟')) return
    await api(`/admin/messages/${m.id}`, { method: 'DELETE' }).catch(() => {})
    load()
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-medium text-[28px]">رسائل العملاء</h1>
      <div className="flex flex-col gap-2">
        {messages.map((m) => (
          <div key={m.id} className={`bg-white p-4 ${m.read ? 'opacity-70' : 'border-r-4 border-black'}`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-medium text-[15px]">{m.name}</span>
              {m.contact && (
                <span className="font-medium text-[13px] text-black/60" dir="ltr">
                  {m.contact}
                </span>
              )}
              <span className="mr-auto font-medium text-[12px] text-black/40" dir="ltr">
                {fmtDate(m.created_at)}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line font-medium text-[14px] leading-[160%]">{m.body}</p>
            <div className="mt-3 flex gap-4">
              {!m.read && (
                <button type="button" onClick={() => markRead(m)} className="font-medium text-[13px] underline">
                  تعليم كمقروءة
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(m)}
                className="font-medium text-[13px] text-red-600 underline"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="py-12 text-center font-medium text-black/40">لا توجد رسائل بعد.</p>
        )}
      </div>
    </div>
  )
}
