import { motion } from 'motion/react'
import { useViewport } from '../useViewport'

const DEFAULT_LABEL = 'ARCHIVE COLLECTION\n"VANS"'
const DEFAULT_BIG_TEXT = 'SHOP NOW'

export function ProductInfo({ label, bigText }: { label?: string; bigText?: string }) {
  const { breakpoint } = useViewport()
  const desktop = breakpoint === 'desktop'

  return (
    <motion.div
      id="outro-info"
      data-outro-offset={desktop ? 166 : 132}
      className="pointer-events-none fixed bottom-12 left-0 right-0 z-20 flex flex-col items-center lg:bottom-20 lg:left-auto lg:right-8 lg:w-[330px]"
      style={{ mixBlendMode: 'exclusion' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.45 }}
    >
      <div className="mb-3 flex w-[252px] flex-col items-start lg:mb-8 lg:w-full">
        <div className="relative mb-2 h-5 w-5 lg:h-[30px] lg:w-[30px]">
          <svg className="block h-full w-full" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18.75" stroke="#fff" strokeWidth={desktop ? 2.5 : 2} />
          </svg>
          <span
            id="circle-symbol"
            className="absolute inset-0 flex items-center justify-center font-medium text-[10px] uppercase tracking-[-0.04em] text-white lg:text-[15px]"
          >
            8
          </span>
        </div>
        <div className="w-full whitespace-pre-line text-center font-medium text-[20px] uppercase leading-[100%] tracking-[-0.04em] text-white lg:text-[30px]">
          {label || DEFAULT_LABEL}
        </div>
      </div>
      <div className="whitespace-pre-line break-words text-center font-medium text-[52px] uppercase leading-[100%] tracking-[-0.04em] text-white lg:text-[64px]">
        {bigText || DEFAULT_BIG_TEXT}
      </div>
    </motion.div>
  )
}
