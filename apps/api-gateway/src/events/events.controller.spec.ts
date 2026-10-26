import * as vitest from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateEventDto, UpdateEventDto } from '@app/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';

vitest.describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: Record<string, vitest.Mock>;

  vitest.beforeEach(async () => {
    eventsService = {
      findOne: vitest.vi.fn().mockResolvedValue({ id: 'event-1' }),
      findAll: vitest.vi.fn().mockResolvedValue([]),
      findMyEvents: vitest.vi.fn().mockResolvedValue([]),
      create: vitest.vi.fn().mockResolvedValue({ id: 'event-1' }),
      update: vitest.vi.fn().mockResolvedValue({ id: 'event-1' }),
      publish: vitest.vi.fn().mockResolvedValue({ id: 'event-1' }),
      cancel: vitest.vi.fn().mockResolvedValue({ id: 'event-1' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: eventsService }],
    }).compile();
    controller = module.get(EventsController);
  });

  vitest.it('delegates public event queries', async () => {
    await vitest
      .expect(controller.findOne('event-1'))
      .resolves.toEqual({ id: 'event-1' });
    await vitest.expect(controller.findAll()).resolves.toEqual([]);
    vitest.expect(eventsService.findOne).toHaveBeenCalledWith('event-1');
    vitest.expect(eventsService.findAll).toHaveBeenCalledTimes(1);
  });

  vitest.it(
    'uses the authenticated user for organizer event queries',
    async () => {
      const request = { user: { userId: 'organizer-1' } };
      await vitest
        .expect(controller.findMyEvents(request))
        .resolves.toEqual([]);
      vitest
        .expect(eventsService.findMyEvents)
        .toHaveBeenCalledWith('organizer-1');
    },
  );

  vitest.it(
    'creates an event with the default role when role is absent',
    async () => {
      const data = { title: 'Concert' } as CreateEventDto;
      const request = { user: { userId: 'organizer-1' } };
      await vitest.expect(controller.create(data, request)).resolves.toEqual({
        id: 'event-1',
      });
      vitest
        .expect(eventsService.create)
        .toHaveBeenCalledWith(data, 'organizer-1', 'USER');
    },
  );

  vitest.it('updates an event with the authenticated user role', async () => {
    const data = { title: 'Updated' } as UpdateEventDto;
    const request = { user: { userId: 'admin-1', role: 'ADMIN' } };
    await vitest
      .expect(controller.update('event-1', data, request))
      .resolves.toEqual({ id: 'event-1' });
    vitest
      .expect(eventsService.update)
      .toHaveBeenCalledWith('event-1', data, 'admin-1', 'ADMIN');

    const organizerRequest = { user: { userId: 'organizer-1' } };
    await vitest
      .expect(controller.update('event-1', data, organizerRequest))
      .resolves.toEqual({ id: 'event-1' });
    vitest
      .expect(eventsService.update)
      .toHaveBeenLastCalledWith('event-1', data, 'organizer-1', 'USER');
  });

  vitest.it(
    'publishes and cancels events while applying the role fallback',
    async () => {
      const user = { user: { userId: 'organizer-1' } };
      const admin = { user: { userId: 'admin-1', role: 'ADMIN' } };
      await vitest
        .expect(controller.publish('event-1', user))
        .resolves.toEqual({ id: 'event-1' });
      await vitest
        .expect(controller.cancel('event-1', admin))
        .resolves.toEqual({ id: 'event-1' });
      vitest
        .expect(eventsService.publish)
        .toHaveBeenCalledWith('event-1', 'organizer-1', 'USER');
      vitest
        .expect(eventsService.cancel)
        .toHaveBeenCalledWith('event-1', 'admin-1', 'ADMIN');

      await vitest
        .expect(controller.publish('event-1', admin))
        .resolves.toEqual({ id: 'event-1' });
      await vitest
        .expect(controller.cancel('event-1', user))
        .resolves.toEqual({ id: 'event-1' });
      vitest
        .expect(eventsService.publish)
        .toHaveBeenLastCalledWith('event-1', 'admin-1', 'ADMIN');
      vitest
        .expect(eventsService.cancel)
        .toHaveBeenLastCalledWith('event-1', 'organizer-1', 'USER');
    },
  );
});
