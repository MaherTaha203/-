import { describe, expect, it } from 'vitest'

import type { FinancialMovement } from '@/types/domain'

import { chronological, withRunningBalance } from './statement-rows'

function movement(
  id: string,
  movementType: FinancialMovement['movementType'],
  voucherDate: string,
  voucherNumber: number,
  amount: number,
): FinancialMovement {
  return {
    id,
    movementType,
    voucherNumber,
    voucherDate,
    amount,
    partyName: movementType === 'receipt' ? 'طالب' : null,
    context: movementType === 'receipt' ? 'دورة' : 'مصروف',
  }
}

describe('financial report running rows', () => {
  it('orders movements by date and voucher number without mutating the input', () => {
    const input = [
      movement('b', 'receipt', '2026-09-02', 2, 100),
      movement('a', 'payment', '2026-09-01', 9, 40),
      movement('c', 'receipt', '2026-09-02', 1, 60),
    ]

    const ordered = chronological(input)

    expect(ordered.map(({ id }) => id)).toEqual(['a', 'c', 'b'])
    expect(input.map(({ id }) => id)).toEqual(['b', 'a', 'c'])
  })

  it('adds receipts and subtracts payments from the opening balance in chronological order', () => {
    const rows = withRunningBalance(
      [
        movement('payment', 'payment', '2026-09-02', 2, 70),
        movement('receipt-2', 'receipt', '2026-09-03', 3, 25),
        movement('receipt-1', 'receipt', '2026-09-01', 1, 100),
      ],
      500,
    )

    expect(rows.map(({ id, runningBalance }) => ({ id, runningBalance }))).toEqual([
      { id: 'receipt-1', runningBalance: 600 },
      { id: 'payment', runningBalance: 530 },
      { id: 'receipt-2', runningBalance: 555 },
    ])
  })
})
