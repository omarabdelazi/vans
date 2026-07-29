/**
 * Scattered gallery layout: each row holds one image at a staggered primary
 * column, plus a second image every 3rd row. Empty cells are -1.
 */
export function buildLayout(count: number, cols: number): number[][] {
  const rows: number[][] = []
  let idx = 0
  let r = 0
  while (idx < count) {
    const row: number[] = new Array(cols).fill(-1)
    const a = (r * 2 + (r % 2)) % cols
    row[a] = idx++
    if (idx < count && r % 3 === 0) {
      let b = (a + 2) % cols
      if (b === a) b = (a + 1) % cols
      row[b] = idx++
    }
    rows.push(row)
    r++
  }
  return rows
}
