import { and, eq, inArray, lt, gt, gte, lte, ne, or } from 'drizzle-orm'
import { addDays, areIntervalsOverlapping, format, getDay, set } from 'date-fns'
import { bookingExceptions, bookings } from '#server/db/schema'

interface CheckAvailabilityInput {
  roomId: string
  startTime: Date
  endTime: Date
  excludeBookingId?: string
}

interface ResolveBookingsInput {
  roomIds: string[]
  rangeStart: Date
  rangeEnd: Date
}

export interface BookingSlot {
  id: string
  sourceBookingId: string
  roomId: string
  userId: string
  startTime: string
  endTime: string
  isRecurring: boolean
  dayOfWeek: number | null
  title: string | null
}

function normalizeDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return areIntervalsOverlapping(
    { start: startA, end: endA },
    { start: startB, end: endB },
    { inclusive: false },
  )
}

function buildOccurrenceFromRecurring(
  recurringBooking: typeof bookings.$inferSelect,
  dayDate: Date,
) {
  const recurringStart = normalizeDate(recurringBooking.startTime)
  const recurringEnd = normalizeDate(recurringBooking.endTime)

  const occurrenceStart = set(dayDate, {
    hours: recurringStart.getHours(),
    minutes: recurringStart.getMinutes(),
    seconds: recurringStart.getSeconds(),
    milliseconds: 0,
  })

  let occurrenceEnd = set(dayDate, {
    hours: recurringEnd.getHours(),
    minutes: recurringEnd.getMinutes(),
    seconds: recurringEnd.getSeconds(),
    milliseconds: 0,
  })

  // If end time is <= start time, treat it as a next-day spillover.
  if (occurrenceEnd <= occurrenceStart) {
    occurrenceEnd = addDays(occurrenceEnd, 1)
  }

  return { start: occurrenceStart, end: occurrenceEnd }
}

export async function checkAvailability(
  db: ReturnType<typeof useDrizzle>,
  input: CheckAvailabilityInput,
): Promise<{ available: boolean; conflictingBookingId?: string }> {
  const { roomId, startTime, endTime, excludeBookingId } = input

  if (endTime <= startTime) {
    throw createError({ statusCode: 400, message: 'Invalid time range' })
  }

  const dayOfWeek = getDay(startTime)
  const dayKey = format(startTime, 'yyyy-MM-dd')

  const baseWhere = excludeBookingId
    ? and(eq(bookings.roomId, roomId), ne(bookings.id, excludeBookingId))
    : eq(bookings.roomId, roomId)

  const candidates = await db
    .select()
    .from(bookings)
    .where(
      and(
        baseWhere,
        or(
          and(
            eq(bookings.isRecurring, false),
            lt(bookings.startTime, endTime),
            gt(bookings.endTime, startTime),
          ),
          and(eq(bookings.isRecurring, true), eq(bookings.dayOfWeek, dayOfWeek)),
        ),
      ),
    )

  if (!candidates.length) {
    return { available: true }
  }

  const recurringIds = candidates.filter((b) => b.isRecurring).map((b) => b.id)

  const releasedByBookingId = new Set<string>()

  if (recurringIds.length > 0) {
    const exceptionRows = await db
      .select({ bookingId: bookingExceptions.bookingId })
      .from(bookingExceptions)
      .where(
        and(
          inArray(bookingExceptions.bookingId, recurringIds),
          eq(bookingExceptions.exceptionDate, dayKey),
          eq(bookingExceptions.status, 'released'),
        ),
      )

    for (const row of exceptionRows) {
      releasedByBookingId.add(row.bookingId)
    }
  }

  for (const candidate of candidates) {
    if (!candidate.isRecurring) {
      return { available: false, conflictingBookingId: candidate.id }
    }

    if (releasedByBookingId.has(candidate.id)) {
      continue
    }

    const startsAt = normalizeDate(candidate.startTime)
    const recurrenceStartsOn = new Date(
      startsAt.getFullYear(),
      startsAt.getMonth(),
      startsAt.getDate(),
      0,
      0,
      0,
      0,
    )
    const requestedDay = new Date(
      startTime.getFullYear(),
      startTime.getMonth(),
      startTime.getDate(),
      0,
      0,
      0,
      0,
    )

    if (requestedDay < recurrenceStartsOn) {
      continue
    }

    const occurrence = buildOccurrenceFromRecurring(candidate, startTime)

    if (overlaps(occurrence.start, occurrence.end, startTime, endTime)) {
      return { available: false, conflictingBookingId: candidate.id }
    }
  }

  return { available: true }
}

export async function getResolvedBookingsForRange(
  db: ReturnType<typeof useDrizzle>,
  input: ResolveBookingsInput,
): Promise<BookingSlot[]> {
  const { roomIds, rangeStart, rangeEnd } = input

  if (!roomIds.length) {
    return []
  }

  const rows = await db
    .select()
    .from(bookings)
    .where(
      and(
        inArray(bookings.roomId, roomIds),
        or(
          and(
            eq(bookings.isRecurring, false),
            lt(bookings.startTime, rangeEnd),
            gt(bookings.endTime, rangeStart),
          ),
          and(eq(bookings.isRecurring, true), lte(bookings.startTime, rangeEnd)),
        ),
      ),
    )

  const recurringRows = rows.filter((row) => row.isRecurring)
  const recurringIds = recurringRows.map((row) => row.id)

  const exceptionRows = recurringIds.length
    ? await db
        .select()
        .from(bookingExceptions)
        .where(
          and(
            inArray(bookingExceptions.bookingId, recurringIds),
            gte(bookingExceptions.exceptionDate, format(rangeStart, 'yyyy-MM-dd')),
            lte(bookingExceptions.exceptionDate, format(rangeEnd, 'yyyy-MM-dd')),
            eq(bookingExceptions.status, 'released'),
          ),
        )
    : []

  const releasedKeys = new Set(exceptionRows.map((row) => `${row.bookingId}:${row.exceptionDate}`))

  const resolved: BookingSlot[] = []

  for (const row of rows) {
    if (!row.isRecurring) {
      resolved.push({
        id: row.id,
        sourceBookingId: row.id,
        roomId: row.roomId,
        userId: row.userId,
        startTime: normalizeDate(row.startTime).toISOString(),
        endTime: normalizeDate(row.endTime).toISOString(),
        isRecurring: false,
        dayOfWeek: row.dayOfWeek,
        title: row.title,
      })
      continue
    }

    const recurringStart = normalizeDate(row.startTime)
    const recurrenceStartDay = new Date(
      recurringStart.getFullYear(),
      recurringStart.getMonth(),
      recurringStart.getDate(),
      0,
      0,
      0,
      0,
    )

    const cursor = new Date(
      rangeStart.getFullYear(),
      rangeStart.getMonth(),
      rangeStart.getDate(),
      0,
      0,
      0,
      0,
    )
    const endCursor = new Date(
      rangeEnd.getFullYear(),
      rangeEnd.getMonth(),
      rangeEnd.getDate(),
      0,
      0,
      0,
      0,
    )

    while (cursor <= endCursor) {
      if (cursor >= recurrenceStartDay && getDay(cursor) === row.dayOfWeek) {
        const dayKey = format(cursor, 'yyyy-MM-dd')
        const releaseKey = `${row.id}:${dayKey}`

        if (!releasedKeys.has(releaseKey)) {
          const occurrence = buildOccurrenceFromRecurring(row, cursor)

          if (overlaps(occurrence.start, occurrence.end, rangeStart, rangeEnd)) {
            resolved.push({
              id: `${row.id}:${dayKey}`,
              sourceBookingId: row.id,
              roomId: row.roomId,
              userId: row.userId,
              startTime: occurrence.start.toISOString(),
              endTime: occurrence.end.toISOString(),
              isRecurring: true,
              dayOfWeek: row.dayOfWeek,
              title: row.title,
            })
          }
        }
      }

      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return resolved.sort((a, b) => a.startTime.localeCompare(b.startTime))
}
