import { format, getDay, parseISO } from 'date-fns'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { bookingExceptions, bookings } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { requireUserSession } from '#server/utils/auth'

const ReleaseSchema = z.object({
  bookingId: z.string().min(1),
  exceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parseResult = ReleaseSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      message: parseResult.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const { bookingId, exceptionDate } = parseResult.data
  const db = useDrizzle()

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1)

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  if (!booking.isRecurring) {
    throw createError({
      statusCode: 400,
      message: 'Only recurring bookings can be released for a specific day',
    })
  }

  const isAdmin = session.user.role === 'admin' || session.user.role === 'owner'

  if (!isAdmin && booking.userId !== session.user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can release only your own recurring bookings',
    })
  }

  const releaseDate = parseISO(`${exceptionDate}T00:00:00`)

  if (Number.isNaN(releaseDate.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid exceptionDate' })
  }

  const releaseDay = getDay(releaseDate)
  if (booking.dayOfWeek !== null && booking.dayOfWeek !== releaseDay) {
    throw createError({
      statusCode: 400,
      message: 'exceptionDate must match the recurring booking day',
    })
  }

  const normalizedDate = format(releaseDate, 'yyyy-MM-dd')

  const [existing] = await db
    .select()
    .from(bookingExceptions)
    .where(
      and(
        eq(bookingExceptions.bookingId, booking.id),
        eq(bookingExceptions.exceptionDate, normalizedDate),
      ),
    )
    .limit(1)

  if (existing) {
    return existing
  }

  const [created] = await db
    .insert(bookingExceptions)
    .values({
      bookingId: booking.id,
      exceptionDate: normalizedDate,
      status: 'released',
    })
    .returning()

  await createAuditLog(
    session.user.id,
    'release_recurring_booking_slot',
    {
      targetType: 'booking_exception',
      targetId: created!.id,
      bookingId: booking.id,
      exceptionDate: normalizedDate,
    },
    event,
  )

  return created
})
