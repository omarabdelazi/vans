import { motion } from 'motion/react'

const DEFAULT_CAPTION =
  'VANS independent shoe store — EU sizes 35-44, delivered all over Egypt. Pay with InstaPay, Vodafone Cash, or cash on delivery.'

export function Caption({ text }: { text?: string }) {
  return (
    <motion.p
      className="pointer-events-none fixed left-4 top-[118px] z-20 w-[calc(100vw-32px)] whitespace-pre-line font-medium text-[12px] leading-[140%] tracking-[-0.04em] text-white sm:top-[180px] sm:w-[calc(50vw-48px)] lg:left-8 lg:top-[244px] lg:w-[692px]"
      style={{ mixBlendMode: 'exclusion' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
    >
      {text || DEFAULT_CAPTION}
    </motion.p>
  )
}
