export interface SchedulePeriod {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
}

/**
 * Splits `totalAmount` evenly across every calendar month touched by
 * [startDate, endDate] (inclusive), clipping the first/last period to the
 * actual accrual boundaries. The last period absorbs the rounding remainder
 * so the schedule always sums back to `totalAmount` exactly.
 */
export function generateMonthlySchedule(startDate: string, endDate: string, totalAmount: number): SchedulePeriod[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid startDate/endDate');
  }
  if (end < start) {
    throw new Error('endDate must be on or after startDate');
  }

  const months: { year: number; month: number }[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endCursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor.getTime() <= endCursor.getTime()) {
    months.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  const count = months.length;
  const baseAmount = Math.round((totalAmount / count) * 100) / 100;

  return months.map((m, idx) => {
    const periodStart = new Date(Date.UTC(m.year, m.month, 1));
    const periodLastDay = new Date(Date.UTC(m.year, m.month + 1, 0));
    const clippedStart = periodStart.getTime() < start.getTime() ? start : periodStart;
    const clippedEnd = periodLastDay.getTime() > end.getTime() ? end : periodLastDay;
    const isLast = idx === count - 1;
    const amount = isLast ? Math.round((totalAmount - baseAmount * (count - 1)) * 100) / 100 : baseAmount;

    return {
      periodLabel: `${m.year}-${String(m.month + 1).padStart(2, '0')}`,
      periodStart: clippedStart.toISOString().slice(0, 10),
      periodEnd: clippedEnd.toISOString().slice(0, 10),
      amount,
    };
  });
}

/**
 * Straight-line depreciation schedule: `numberOfMonths` equal periods
 * starting the acquisition month (first period clipped to the acquisition
 * date), each spanning a full calendar month thereafter.
 */
export function generateStraightLinePeriods(
  startDate: string,
  numberOfMonths: number,
  totalAmount: number,
): SchedulePeriod[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid startDate');
  }
  if (numberOfMonths < 1) {
    throw new Error('numberOfMonths must be >= 1');
  }

  const baseAmount = Math.round((totalAmount / numberOfMonths) * 100) / 100;
  const periods: SchedulePeriod[] = [];

  for (let idx = 0; idx < numberOfMonths; idx++) {
    const year = start.getUTCFullYear();
    const month = start.getUTCMonth() + idx;
    const periodStartDate = idx === 0 ? start : new Date(Date.UTC(year, month, 1));
    const periodEndDate = new Date(Date.UTC(year, month + 1, 0));
    const isLast = idx === numberOfMonths - 1;
    const amount = isLast ? Math.round((totalAmount - baseAmount * (numberOfMonths - 1)) * 100) / 100 : baseAmount;

    periods.push({
      periodLabel: `${periodEndDate.getUTCFullYear()}-${String(periodEndDate.getUTCMonth() + 1).padStart(2, '0')}`,
      periodStart: periodStartDate.toISOString().slice(0, 10),
      periodEnd: periodEndDate.toISOString().slice(0, 10),
      amount,
    });
  }

  return periods;
}
