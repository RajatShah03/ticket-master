import * as vitest from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsServiceService } from './events-service.service';
import { EventsServiceController } from './events-service.controller';

vitest.describe('EventsServiceController', () => {
  let controller: EventsServiceController;
  let eventsService: Record<string, vitest.Mock>;

  vitest.beforeEach(async () => {
    eventsService = {
      create: vitest.vi.fn().mockResolvedValue({ id: 'event-1' }),
      findAll: vitest.vi.fn().mockResolvedValue([]),
      findMyEvents: vitest.vi.fn().mockResolvedValue([]),
      findOne: vitest.vi.fn().mockResolvedValue({ id: 'event-1' }),
      update: vitest.vi.fn().mockResolvedValue({ id: 'event-1' }),
      publish: vitest.vi.fn().mockResolvedValue({ id: 'event-1' }),
      cancel: vitest.vi.fn().mockResolvedValue({ id: 'event-1' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsServiceController],
      providers: [{ provide: EventsServiceService, useValue: eventsService }],
    }).compile();
    controller = module.get(EventsServiceController);
  });

  vitest.it('returns events service liveness', () => {
    vitest.expect(controller.healthCheck()).toEqual({
      status: 'ok',
      service: 'events-service',
    });
  });

  vitest.it('delegates event creation', async () => {
    const dto = {
      title: 'Concert',
      date: new Date('2027-01-01T19:00:00.000Z'),
      location: 'Main Hall',
      capacity: 100,
    };
    await vitest
      .expect(controller.create(dto, 'organizer-1'))
      .resolves.toEqual({
        id: 'event-1',
      });
    vitest
      .expect(eventsService.create)
      .toHaveBeenCalledWith(dto, 'organizer-1');
  });

  vitest.it('delegates event listing', async () => {
    await vitest.expect(controller.findAll()).resolves.toEqual([]);
    vitest.expect(eventsService.findAll).toHaveBeenCalledTimes(1);
  });

  vitest.it('delegates organizer event listing', async () => {
    await vitest
      .expect(controller.findMyEvents('organizer-1'))
      .resolves.toEqual([]);
    vitest
      .expect(eventsService.findMyEvents)
      .toHaveBeenCalledWith('organizer-1');
  });

  vitest.it('delegates event lookup', async () => {
    await vitest.expect(controller.findOne('event-1')).resolves.toEqual({
      id: 'event-1',
    });
    vitest.expect(eventsService.findOne).toHaveBeenCalledWith('event-1');
  });

  vitest.it('delegates updates with actor identity and role', async () => {
    const dto = { title: 'Updated' };
    await vitest
      .expect(controller.update('event-1', dto, 'user-1', 'ADMIN'))
      .resolves.toEqual({ id: 'event-1' });
    vitest
      .expect(eventsService.update)
      .toHaveBeenCalledWith('event-1', dto, 'user-1', 'ADMIN');
  });

  vitest.it('delegates publish and cancel actions', async () => {
    await vitest
      .expect(controller.publish('event-1', 'user-1', 'ORGANIZER'))
      .resolves.toEqual({ id: 'event-1' });
    await vitest
      .expect(controller.cancel('event-1', 'user-1', 'ORGANIZER'))
      .resolves.toEqual({ id: 'event-1' });
    vitest
      .expect(eventsService.publish)
      .toHaveBeenCalledWith('event-1', 'user-1', 'ORGANIZER');
    vitest
      .expect(eventsService.cancel)
      .toHaveBeenCalledWith('event-1', 'user-1', 'ORGANIZER');
  });
});
