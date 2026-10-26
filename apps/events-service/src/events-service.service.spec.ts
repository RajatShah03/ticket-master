import * as vitest from 'vitest';
import { DatabaseService, events } from '@app/database';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsServiceService } from './events-service.service';

function query(result: unknown[]) {
  const builder = {
    from: vitest.vi.fn(),
    where: vitest.vi.fn(),
    limit: vitest.vi.fn().mockResolvedValue(result),
    then: (
      onfulfilled: (value: unknown[]) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
}

vitest.describe('EventsServiceService', () => {
  let service: EventsServiceService;
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
        EventsServiceService,
        { provide: KAFKA_SERVICE, useValue: kafka },
        { provide: DatabaseService, useValue: { db } },
      ],
    }).compile();
    service = module.get(EventsServiceService);
  });

  vitest.it('connects to Kafka on module initialization', async () => {
    await service.onModuleInit();
    vitest.expect(kafka.connect).toHaveBeenCalledTimes(1);
  });

  vitest.it('creates an event and publishes its creation', async () => {
    const created = {
      id: 'event-1',
      title: 'Concert',
      organizerId: 'organizer-1',
    };
    const returning = vitest.vi.fn().mockResolvedValue([created]);
    const values = vitest.vi.fn().mockReturnValue({ returning });
    db.insert.mockReturnValue({ values });
    const input = {
      title: 'Concert',
      description: 'Live music',
      date: new Date('2027-01-01T19:00:00.000Z'),
      location: 'Hall',
      capacity: 100,
    };

    await vitest
      .expect(service.create(input, 'organizer-1'))
      .resolves.toEqual(created);
    vitest.expect(db.insert).toHaveBeenCalledWith(events);
    vitest.expect(values).toHaveBeenCalledWith(
      vitest.expect.objectContaining({
        ...input,
        date: new Date(input.date),
        price: 0,
        organizerId: 'organizer-1',
      }),
    );
    vitest.expect(kafka.emit).toHaveBeenCalledWith(
      KAFKA_TOPICS.EVENT_CREATED,
      vitest.expect.objectContaining({
        eventId: 'event-1',
        organizerId: 'organizer-1',
        title: 'Concert',
      }),
    );
    vitest
      .expect(typeof kafka.emit.mock.calls[0]?.[1].timestamp)
      .toBe('string');
  });

  vitest.it('returns published events', async () => {
    const published = [{ id: 'event-1', status: 'PUBLISHED' }];
    db.select.mockReturnValue(query(published));
    await vitest.expect(service.findAll()).resolves.toEqual(published);
  });

  vitest.it('returns an event by id', async () => {
    const event = { id: 'event-1', organizerId: 'organizer-1' };
    db.select.mockReturnValue(query([event]));
    await vitest.expect(service.findOne('event-1')).resolves.toEqual(event);
  });

  vitest.it('throws when an event does not exist', async () => {
    db.select.mockReturnValue(query([]));
    await vitest
      .expect(service.findOne('missing'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  vitest.it(
    'updates an owned event, converts a supplied date, and publishes changes',
    async () => {
      const existing = { id: 'event-1', organizerId: 'organizer-1' };
      const updated = { ...existing, title: 'New title' };
      db.select.mockReturnValue(query([existing]));
      const returning = vitest.vi.fn().mockResolvedValue([updated]);
      const where = vitest.vi.fn().mockReturnValue({ returning });
      const set = vitest.vi
        .fn<(values: Record<string, unknown>) => unknown>()
        .mockReturnValue({ where });
      db.update.mockReturnValue({ set });
      const changes = {
        title: 'New title',
        date: new Date('2027-02-01T19:00:00.000Z'),
      };

      await vitest
        .expect(service.update('event-1', changes, 'organizer-1', 'ORGANIZER'))
        .resolves.toEqual(updated);
      vitest.expect(set).toHaveBeenCalledWith(
        vitest.expect.objectContaining({
          title: 'New title',
          date: new Date(changes.date),
        }),
      );
      vitest.expect(set.mock.calls[0]?.[0].updatedAt).toBeInstanceOf(Date);
      vitest.expect(kafka.emit).toHaveBeenCalledWith(
        KAFKA_TOPICS.EVENT_UPDATED,
        vitest.expect.objectContaining({
          eventId: 'event-1',
          changes: ['title', 'date'],
        }),
      );
      vitest
        .expect(typeof kafka.emit.mock.calls[0]?.[1].timestamp)
        .toBe('string');
    },
  );

  vitest.it(
    'allows admins to update events and omits date conversion when absent',
    async () => {
      const existing = { id: 'event-1', organizerId: 'organizer-1' };
      db.select.mockReturnValue(query([existing]));
      const returning = vitest.vi.fn().mockResolvedValue([{ id: 'event-1' }]);
      const where = vitest.vi.fn().mockReturnValue({ returning });
      const set = vitest.vi
        .fn<(values: Record<string, unknown>) => unknown>()
        .mockReturnValue({ where });
      db.update.mockReturnValue({ set });

      await service.update(
        'event-1',
        { title: 'Admin edit' },
        'admin-1',
        'ADMIN',
      );
      vitest
        .expect(set)
        .toHaveBeenCalledWith(
          vitest.expect.objectContaining({ title: 'Admin edit' }),
        );
      vitest.expect(set.mock.calls[0]?.[0].updatedAt).toBeInstanceOf(Date);
    },
  );

  vitest.it('rejects updates by non-owners who are not admins', async () => {
    db.select.mockReturnValue(query([{ id: 'event-1', organizerId: 'owner' }]));
    await vitest
      .expect(service.update('event-1', {}, 'other', 'USER'))
      .rejects.toBeInstanceOf(ForbiddenException);
    vitest.expect(db.update).not.toHaveBeenCalled();
  });

  vitest.it('publishes an owned event', async () => {
    const existing = { id: 'event-1', organizerId: 'owner' };
    const updated = { ...existing, status: 'PUBLISHED' };
    db.select.mockReturnValue(query([existing]));
    const returning = vitest.vi.fn().mockResolvedValue([updated]);
    const where = vitest.vi.fn().mockReturnValue({ returning });
    const set = vitest.vi
      .fn<(values: Record<string, unknown>) => unknown>()
      .mockReturnValue({ where });
    db.update.mockReturnValue({ set });

    await vitest
      .expect(service.publish('event-1', 'owner', 'ORGANIZER'))
      .resolves.toEqual(updated);
    vitest
      .expect(set)
      .toHaveBeenCalledWith(
        vitest.expect.objectContaining({ status: 'PUBLISHED' }),
      );
    vitest.expect(set.mock.calls[0]?.[0].updatedAt).toBeInstanceOf(Date);
  });

  vitest.it(
    'rejects publishing by a non-owner who is not an admin',
    async () => {
      db.select.mockReturnValue(
        query([{ id: 'event-1', organizerId: 'owner' }]),
      );
      await vitest
        .expect(service.publish('event-1', 'other', 'USER'))
        .rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  vitest.it('cancels an owned event and publishes cancellation', async () => {
    const existing = { id: 'event-1', organizerId: 'owner' };
    const cancelled = { ...existing, status: 'CANCELLED' };
    db.select.mockReturnValue(query([existing]));
    const returning = vitest.vi.fn().mockResolvedValue([cancelled]);
    const where = vitest.vi.fn().mockReturnValue({ returning });
    const set = vitest.vi.fn().mockReturnValue({ where });
    db.update.mockReturnValue({ set });

    await vitest
      .expect(service.cancel('event-1', 'owner', 'ORGANIZER'))
      .resolves.toEqual(cancelled);
    vitest.expect(kafka.emit).toHaveBeenCalledWith(
      KAFKA_TOPICS.EVENT_CANCELLED,
      vitest.expect.objectContaining({
        eventId: 'event-1',
        organizerId: 'owner',
      }),
    );
    vitest
      .expect(typeof kafka.emit.mock.calls[0]?.[1].timestamp)
      .toBe('string');
  });

  vitest.it(
    'rejects cancellation by a non-owner who is not an admin',
    async () => {
      db.select.mockReturnValue(
        query([{ id: 'event-1', organizerId: 'owner' }]),
      );
      await vitest
        .expect(service.cancel('event-1', 'other', 'USER'))
        .rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  vitest.it('lists events for an organizer', async () => {
    const result = [{ id: 'event-1', organizerId: 'organizer-1' }];
    db.select.mockReturnValue(query(result));
    await vitest
      .expect(service.findMyEvents('organizer-1'))
      .resolves.toEqual(result);
  });
});
