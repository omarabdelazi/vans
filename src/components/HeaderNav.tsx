import { motion } from 'motion/react'

export function HeaderNav() {
  return (
    <motion.header
      className="pointer-events-none fixed right-4 top-4 z-20 flex h-[30px] flex-row items-center justify-between sm:w-[330px] lg:right-8 lg:top-8"
      style={{ mixBlendMode: 'exclusion' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
    >
      <span className="hidden font-medium text-[15px] uppercase text-white sm:block">About</span>
      <div className="flex flex-row items-center gap-5 lg:gap-[50px]">
        <svg viewBox="0 0 40 40" className="h-6 w-6 lg:h-[30px] lg:w-[30px]" fill="none">
          <path d="M0 14H40" stroke="#fff" strokeWidth="2.5" />
          <path d="M0 26H40" stroke="#fff" strokeWidth="2.5" />
        </svg>
        <span className="font-medium text-[13px] text-white lg:text-[15px]">[ CART ]</span>
      </div>
    </motion.header>
  )
}
