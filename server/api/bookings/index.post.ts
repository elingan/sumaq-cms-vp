import { differenceInMinutes, getDay, parseISO } from 'date-fns'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { bookings, rooms } from '#server/db/schema'
import { createAuditLog } from '#server/utils/audit'
import { requireUserSession } from '#server/utils/auth'
import { checkAvailability } from '#server/utils/bookings'

const CreateBookingSchema = z.object({
  roomId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  title: z.string().max(255).optional(),
  userId: z.string().min(1).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parseResult = CreateBookingSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      message: parseResult.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  const data = parseResult.data
  const startTime = parseISO(data.startTime)
  const endTime = parseISO(data.endTime)

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid datetime payload' })
  }

  if (endTime <= startTime) {
    throw createError({ statusCode: 400, message: 'Invalid time range' })
  }

  if (startTime.getMinutes() !== 0 || endTime.getMinutes() !== 0) {
    throw createError({ statusCode: 400, message: 'Bookings must start/end on full hours' })
  }

  if (differenceInMinutes(endTime, startTime) !== 60) {
    throw createError({ statusCode: 400, message: 'Booking duration must be exactly 1 hour' })
  }

  const startHour = startTime.getHours()
  const endHour = endTime.getHours()

  if (startHour < 8 || endHour > 20) {
    throw createError({ statusCode: 400, message: 'Bookings must be between 08:00 and 20:00' })
  }

  const isAdmin = session.user.role === 'admin'

  if (data.isRecurring && !isAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Only admin users can create recurring bookings',
    })
  }

  const requestedDay = getDay(startTime)
  const dayOfWeek = data.isRecurring ? (data.dayOfWeek ?? requestedDay) : null

  if (data.isRecurring && dayOfWeek !== requestedDay) {
    throw createError({
      statusCode: 400,
      message: 'dayOfWeek must match the booking startTime day',
    })
  }

  const db = useDrizzle()

  const [room] = await db.select().from(rooms).where(eq(rooms.id, data.roomId)).limit(1)

  if (!room) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  const availability = await checkAvailability(db, {
    roomId: data.roomId,
    startTime,
    endTime,
  })

  if (!availability.available) {
    throw createError({
      statusCode: 409,
      message: 'Selected slot is not available',
      data: {
        conflictBookingId: availability.conflictingBookingId,
      },
    })
  }

  const assigneeUserId = isAdmin && data.userId ? data.userId : session.user.id

  const [created] = await db
    .insert(bookings)
    .values({
      roomId: data.roomId,
      userId: assigneeUserId,
      startTime,
      endTime,
      isRecurring: data.isRecurring,
      dayOfWeek,
      title: data.title,
    })
    .returning()

  await createAuditLog(
    session.user.id,
    'create_booking',
    {
      targetType: 'booking',
      targetId: created!.id,
      roomId: created!.roomId,
      userId: created!.userId,
      isRecurring: created!.isRecurring,
    },
    event,
  )

  return created
})
