import * as vitest from 'vitest';
import { DatabaseService } from '@app/database';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketsServiceService } from './tickets-service.service';

function query(result: unknown[]) {
  const builder = {
    from: vitest.vi.fn(),
    innerJoin: vitest.vi.fn(),
    where: vitest.vi.fn(),
    limit: vitest.vi.fn().mockResolvedValue(result),
    then: (
      onfulfilled: (value: unknown[]) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
}

vitest.describe('TicketsServiceService', () => {
  let service: TicketsServiceService;
  let db: { select: vitest.Mock; insert: vitest.Mock; update: vitest.Mock };
  let kafka: {
    connect: vitest.Mock<() => Promise<void>>;
    emit: vitest.Mock<
      (topic: string, payload: Record<string, unknown>) => void
    >;
  };

  vitest.beforeEach(async () => {
    db = {
      select: vitest.vi.fn(),
      insert: vitest.vi.fn(),
      update: vitest.vi.fn(),
    };
    kafka = {
      connect: vitest.vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      emit: vitest.vi.fn<
        (topic: string, payload: Record<string, unknown>) => void
      >(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsServiceService,
        { provide: KAFKA_SERVICE, useValue: kafka },
        { provide: DatabaseService, useValue: { db } },
      ],
    }).compile();
    service = module.get(TicketsServiceService);
  });

  vitest.it('connects to Kafka during initialization', async () => {
    await service.onModuleInit();
    vitest.expect(kafka.connect).toHaveBeenCalledTimes(1);
  });

  vitest.it('rejects a purchase for a missing event', async () => {
    db.select.mockReturnValue(query([]));
    await vitest
      .expect(service.purchase({ eventId: 'event-1', quantity: 1 }, 'user-1'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  vitest.it('rejects a purchase for an unpublished event', async () => {
    db.select.mockReturnValue(
      query([{ id: 'event-1', status: 'DRAFT', capacity: 10 }]),
    );
    await vitest
      .expect(service.purchase({ eventId: 'event-1', quantity: 1 }, 'user-1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  vitest.it(
    'rejects a purchase when remaining capacity is insufficient',
    async () => {
      db.select
        .mockReturnValueOnce(
          query([{ id: 'event-1', status: 'PUBLISHED', capacity: 3 }]),
        )
        .mockReturnValueOnce(query([{ total: 2 }]));
      await vitest
        .expect(service.purchase({ eventId: 'event-1', quantity: 2 }, 'user-1'))
        .rejects.toThrow('Not enough tickets available. Remaining: 1');
    },
  );

  vitest.it(
    'creates a purchase, calculates totals, and emits the purchase event',
    async () => {
      const event = {
        id: 'event-1',
        title: 'Concert',
        status: 'PUBLISHED',
        capacity: 10,
        price: 25,
      };
      db.select
        .mockReturnValueOnce(query([event]))
        .mockReturnValueOnce(query([{ total: '3' }]));
      const created = {
        id: 'ticket-1',
        eventId: 'event-1',
        userId: 'user-1',
        quantity: 2,
        totalPrice: 50,
        ticketCode: 'ABC123',
        status: 'CONFIRMED',
        purchasedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      const returning = vitest.vi.fn().mockResolvedValue([created]);
      const values = vitest.vi
        .fn<(data: Record<string, unknown>) => unknown>()
        .mockReturnValue({ returning });
      db.insert.mockReturnValue({ values });

      await vitest
        .expect(service.purchase({ eventId: 'event-1', quantity: 2 }, 'user-1'))
        .resolves.toEqual({
          message: 'Ticket purchased successfully',
          ticket: {
            id: 'ticket-1',
            ticketCode: 'ABC123',
            eventTitle: 'Concert',
            quantity: 2,
            totalPrice: 50,
            status: 'CONFIRMED',
            purchasedAt: created.purchasedAt,
          },
        });
      vitest.expect(values).toHaveBeenCalledWith(
        vitest.expect.objectContaining({
          eventId: 'event-1',
          userId: 'user-1',
          quantity: 2,
          totalPrice: 50,
          status: 'CONFIRMED',
        }),
      );
      vitest
        .expect(values.mock.calls[0]?.[0].ticketCode)
        .toMatch(/^[A-F0-9]{12}$/);
      vitest.expect(kafka.emit).toHaveBeenCalledWith(
        KAFKA_TOPICS.TICKET_PURCHASED,
        vitest.expect.objectContaining({
          ticketId: 'ticket-1',
          eventId: 'event-1',
          userId: 'user-1',
          quantity: 2,
          totalPrice: 50,
          ticketCode: 'ABC123',
        }),
      );
      vitest
        .expect(typeof kafka.emit.mock.calls[0]?.[1].timestamp)
        .toBe('string');
    },
  );

  vitest.it('uses zero when no sold-ticket aggregate is returned', async () => {
    db.select
      .mockReturnValueOnce(
        query([
          {
            id: 'event-1',
            title: 'Concert',
            status: 'PUBLISHED',
            capacity: 2,
            price: 0,
          },
        ]),
      )
      .mockReturnValueOnce(query([]));
    const returning = vitest.vi.fn().mockResolvedValue([
      {
        id: 'ticket-1',
        eventId: 'event-1',
        userId: 'user-1',
        quantity: 1,
        totalPrice: 0,
        ticketCode: 'ABC123',
        status: 'CONFIRMED',
      },
    ]);
    db.insert.mockReturnValue({
      values: vitest.vi.fn().mockReturnValue({ returning }),
    });

    await vitest
      .expect(service.purchase({ eventId: 'event-1', quantity: 1 }, 'user-1'))
      .resolves.toMatchObject({ ticket: { totalPrice: 0 } });
  });

  vitest.it('lists the current user tickets', async () => {
    const result = [{ id: 'ticket-1', eventTitle: 'Concert' }];
    db.select.mockReturnValue(query(result));
    await vitest
      .expect(service.findMyTicket('user-1'))
      .resolves.toEqual(result);
  });

  vitest.it('returns ticket details for its owner', async () => {
    const result = { id: 'ticket-1', userId: 'user-1', eventTitle: 'Concert' };
    db.select.mockReturnValue(query([result]));
    await vitest
      .expect(service.findOne('ticket-1', 'user-1'))
      .resolves.toEqual(result);
  });

  vitest.it('rejects lookup of a missing ticket', async () => {
    db.select.mockReturnValue(query([]));
    await vitest
      .expect(service.findOne('missing', 'user-1'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  vitest.it('rejects ticket details returned for another user', async () => {
    db.select.mockReturnValue(query([{ id: 'ticket-1', userId: 'other' }]));
    await vitest
      .expect(service.findOne('ticket-1', 'user-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  vitest.it('rejects cancellation of a missing ticket', async () => {
    db.select.mockReturnValue(query([]));
    await vitest
      .expect(service.cancel('missing', 'user-1'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  vitest.it('rejects cancellation by a different user', async () => {
    db.select.mockReturnValue(query([{ id: 'ticket-1', userId: 'owner' }]));
    await vitest
      .expect(service.cancel('ticket-1', 'other'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  vitest.it('rejects cancellation of an already-cancelled ticket', async () => {
    db.select.mockReturnValue(
      query([{ id: 'ticket-1', userId: 'user-1', status: 'CANCELLED' }]),
    );
    await vitest
      .expect(service.cancel('ticket-1', 'user-1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  vitest.it('rejects cancellation of a checked-in ticket', async () => {
    db.select.mockReturnValue(
      query([{ id: 'ticket-1', userId: 'user-1', status: 'CHECKED_IN' }]),
    );
    await vitest
      .expect(service.cancel('ticket-1', 'user-1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  vitest.it('cancels an eligible ticket and emits cancellation', async () => {
    const ticket = {
      id: 'ticket-1',
      userId: 'user-1',
      eventId: 'event-1',
      status: 'CONFIRMED',
    };
    db.select.mockReturnValue(query([ticket]));
    const cancelled = { ...ticket, status: 'CANCELLED' };
    const returning = vitest.vi.fn().mockResolvedValue([cancelled]);
    const where = vitest.vi.fn().mockReturnValue({ returning });
    const set = vitest.vi.fn().mockReturnValue({ where });
    db.update.mockReturnValue({ set });

    await vitest.expect(service.cancel('ticket-1', 'user-1')).resolves.toEqual({
      message: 'Ticket cancelled successfully',
    });
    vitest.expect(kafka.emit).toHaveBeenCalledWith(
      KAFKA_TOPICS.TICKET_CANCELLED,
      vitest.expect.objectContaining({
        ticketId: 'ticket-1',
        eventId: 'event-1',
        userId: 'user-1',
      }),
    );
    vitest
      .expect(typeof kafka.emit.mock.calls[0]?.[1].timestamp)
      .toBe('string');
  });

  vitest.it('rejects check-in for a missing ticket', async () => {
    db.select.mockReturnValue(query([]));
    await vitest
      .expect(service.checkIn('UNKNOWN', 'organizer-1'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  vitest.it('rejects check-in by an event non-organizer', async () => {
    db.select
      .mockReturnValueOnce(
        query([{ id: 'ticket-1', eventId: 'event-1', status: 'CONFIRMED' }]),
      )
      .mockReturnValueOnce(query([{ id: 'event-1', organizerId: 'owner' }]));
    await vitest
      .expect(service.checkIn('CODE', 'other'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  vitest.it('rejects check-in for an already checked-in ticket', async () => {
    db.select
      .mockReturnValueOnce(
        query([{ id: 'ticket-1', eventId: 'event-1', status: 'CHECKED_IN' }]),
      )
      .mockReturnValueOnce(
        query([{ id: 'event-1', organizerId: 'organizer-1' }]),
      );
    await vitest
      .expect(service.checkIn('CODE', 'organizer-1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  vitest.it('rejects check-in for a cancelled ticket', async () => {
    db.select
      .mockReturnValueOnce(
        query([{ id: 'ticket-1', eventId: 'event-1', status: 'CANCELLED' }]),
      )
      .mockReturnValueOnce(
        query([{ id: 'event-1', organizerId: 'organizer-1' }]),
      );
    await vitest
      .expect(service.checkIn('CODE', 'organizer-1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  vitest.it('checks in an eligible ticket and emits the event', async () => {
    db.select
      .mockReturnValueOnce(
        query([
          {
            id: 'ticket-1',
            eventId: 'event-1',
            status: 'CONFIRMED',
            quantity: 2,
          },
        ]),
      )
      .mockReturnValueOnce(
        query([{ id: 'event-1', organizerId: 'organizer-1' }]),
      );
    const checkedIn = {
      id: 'ticket-1',
      eventId: 'event-1',
      ticketCode: 'CODE',
      quantity: 2,
      status: 'CHECKED_IN',
      checkedInAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const returning = vitest.vi.fn().mockResolvedValue([checkedIn]);
    const where = vitest.vi.fn().mockReturnValue({ returning });
    const set = vitest.vi.fn().mockReturnValue({ where });
    db.update.mockReturnValue({ set });

    await vitest
      .expect(service.checkIn('CODE', 'organizer-1'))
      .resolves.toEqual({
        message: 'Ticket checked in successfully.',
        ticket: {
          id: 'ticket-1',
          ticketCode: 'CODE',
          quantity: 2,
          status: 'CHECKED_IN',
          checkedInAt: checkedIn.checkedInAt,
        },
      });
    vitest.expect(kafka.emit).toHaveBeenCalledWith(
      KAFKA_TOPICS.TICKET_CHECKED_IN,
      vitest.expect.objectContaining({
        ticketId: 'ticket-1',
        eventId: 'event-1',
        ticketCode: 'CODE',
      }),
    );
    vitest
      .expect(typeof kafka.emit.mock.calls[0]?.[1].timestamp)
      .toBe('string');
  });

  vitest.it('rejects event ticket listing for a missing event', async () => {
    db.select.mockReturnValue(query([]));
    await vitest
      .expect(service.findEventTicket('event-1', 'organizer-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  vitest.it('rejects event ticket listing by a non-organizer', async () => {
    db.select.mockReturnValue(query([{ id: 'event-1', organizerId: 'owner' }]));
    await vitest
      .expect(service.findEventTicket('event-1', 'other'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  vitest.it('lists tickets for an event owned by the organizer', async () => {
    const ticketsForEvent = [{ id: 'ticket-1' }];
    db.select
      .mockReturnValueOnce(
        query([{ id: 'event-1', organizerId: 'organizer-1' }]),
      )
      .mockReturnValueOnce(query(ticketsForEvent));
    await vitest
      .expect(service.findEventTicket('event-1', 'organizer-1'))
      .resolves.toEqual(ticketsForEvent);
    vitest.expect(db.select).toHaveBeenCalledTimes(2);
  });
});
