import { motion } from 'motion/react'

export function Caption() {
  return (
    <motion.p
      className="pointer-events-none fixed left-4 top-[118px] z-20 w-[calc(100vw-32px)] font-medium text-[12px] leading-[140%] tracking-[-0.04em] text-white sm:top-[180px] sm:w-[calc(50vw-48px)] lg:left-8 lg:top-[244px] lg:w-[692px]"
      style={{ mixBlendMode: 'exclusion' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
    >
      When switching between videos near the center, do not reset currentTime to 0 abruptly. Add a
      small dead zone: if cursor is within +/-50px of center, keep both videos at currentTime = 0
      and show whichever was last active.
    </motion.p>
  )
}
