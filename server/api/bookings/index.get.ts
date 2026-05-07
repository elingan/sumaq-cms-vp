import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import { endOfDay, parseISO, startOfDay } from 'date-fns'
import { z } from 'zod'
import { bookingExceptions, bookings, locations, locationRooms } from '#server/db/schema'
import { requireUserSession } from '#server/utils/auth'
import { getResolvedBookingsForRange } from '#server/utils/bookings'

const QuerySchema = z.object({
  locationId: z.string().min(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const queryResult = QuerySchema.safeParse(getQuery(event))

  if (!queryResult.success) {
    throw createError({
      statusCode: 400,
      message: queryResult.error.issues[0]?.message ?? 'Invalid query params',
    })
  }

  const { locationId, from, to } = queryResult.data
  const rangeStart = startOfDay(parseISO(from))
  const rangeEnd = endOfDay(parseISO(to))

  if (
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime()) ||
    rangeEnd < rangeStart
  ) {
    throw createError({ statusCode: 400, message: 'Invalid date range' })
  }

  const db = useDrizzle()

  const [location] = await db.select().from(locations).where(eq(locations.id, locationId)).limit(1)

  if (!location) {
    throw createError({ statusCode: 404, message: 'Location not found' })
  }

  const roomsForLocation = await db
    .select()
    .from(locationRooms)
    .where(eq(locationRooms.locationId, locationId))
    .orderBy(locationRooms.name)

  const roomIds = roomsForLocation.map((room) => room.id)

  const resolvedBookings = await getResolvedBookingsForRange(db, {
    roomIds,
    rangeStart,
    rangeEnd,
  })

  let exceptions: Array<typeof bookingExceptions.$inferSelect> = []

  if (roomIds.length > 0) {
    const recurringRows = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(inArray(bookings.roomId, roomIds), eq(bookings.isRecurring, true)))

    const recurringIds = recurringRows.map((row) => row.id)

    if (recurringIds.length > 0) {
      exceptions = await db
        .select()
        .from(bookingExceptions)
        .where(
          and(
            inArray(bookingExceptions.bookingId, recurringIds),
            gte(bookingExceptions.exceptionDate, from),
            lte(bookingExceptions.exceptionDate, to),
          ),
        )
    }
  }

  return {
    location,
    rooms: roomsForLocation,
    bookings: resolvedBookings,
    exceptions,
  }
})
