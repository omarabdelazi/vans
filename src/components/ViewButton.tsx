export function ViewButton() {
  return (
    <div
      id="outro-buy"
      className="pointer-events-none fixed bottom-[60px] left-4 right-4 z-20 flex h-[100px] items-center justify-center rounded-[1335px] bg-white lg:bottom-8 lg:left-auto lg:right-8 lg:h-[174px] lg:w-[330px]"
      style={{
        mixBlendMode: 'exclusion',
        transform: 'scale(0)',
        transformOrigin: 'right bottom',
      }}
    >
      <span
        className="font-medium text-[72px] tracking-[-0.04em] text-white lg:text-[110px]"
        style={{ mixBlendMode: 'exclusion' }}
      >
        view
      </span>
    </div>
  )
}
