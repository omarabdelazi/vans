import { motion } from 'motion/react'

export function Logo() {
  return (
    <motion.div
      className="pointer-events-none fixed left-4 top-4 z-20 w-[124px] sm:w-[266px] lg:left-8 lg:top-8 lg:w-[355px]"
      style={{ mixBlendMode: 'exclusion' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0 }}
    >
      <svg viewBox="0 0 355 110" className="block w-full" fill="none">
        <text
          x="0"
          y="85"
          fill="#fff"
          fontFamily="'Inter Tight', system-ui, sans-serif"
          fontWeight="500"
          fontSize="110"
          letterSpacing="-0.04em"
        >
          vans
        </text>
        <circle cx="290" cy="16" r="11.75" stroke="#fff" strokeWidth="2.5" />
        <text
          x="290"
          y="21"
          textAnchor="middle"
          fill="#fff"
          fontFamily="'Inter Tight', system-ui, sans-serif"
          fontWeight="500"
          fontSize="14"
        >
          R
        </text>
      </svg>
    </motion.div>
  )
}
