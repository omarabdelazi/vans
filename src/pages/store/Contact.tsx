import { useState, type FormEvent } from 'react'
import { api } from '../../lib/api'

export default function Contact() {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      await api('/messages', {
        method: 'POST',
        body: JSON.stringify({ name, contact, body }),
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'something went wrong')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center">
        <h1 className="font-medium text-[34px] uppercase tracking-[-0.04em]">Message sent ✓</h1>
        <p className="mt-3 font-medium text-[14px] text-black/60">
          وصلتنا رسالتك وهنرد عليك في أقرب وقت.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 font-medium text-[42px] uppercase leading-none tracking-[-0.04em]">
        Contact us
      </h1>
      <p className="mb-8 font-medium text-[14px] text-black/60">
        اكتبلنا أي سؤال عن المقاسات أو الطلبات وهنرد عليك.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="block">
          <span className="mb-1 block font-medium text-[13px] uppercase">Name — الاسم</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 w-full border border-black/25 px-4 font-medium text-[14px] outline-none focus:border-black"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-[13px] uppercase">
            Phone / Email — للتواصل
          </span>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="h-12 w-full border border-black/25 px-4 font-medium text-[14px] outline-none focus:border-black"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-[13px] uppercase">Message — الرسالة</span>
          <textarea
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full resize-none border border-black/25 px-4 py-3 font-medium text-[14px] outline-none focus:border-black"
          />
        </label>
        {error && <p className="font-medium text-[13px] text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={sending}
          className="h-14 bg-black font-medium text-[15px] uppercase text-white disabled:opacity-40"
        >
          {sending ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  )
}
