import * as vitest from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketsServiceService } from './tickets-service.service';
import { TicketsServiceController } from './tickets-service.controller';

vitest.describe('TicketsServiceController', () => {
  let controller: TicketsServiceController;
  let ticketsService: Record<string, vitest.Mock>;

  vitest.beforeEach(async () => {
    ticketsService = {
      findMyTicket: vitest.vi.fn().mockResolvedValue([]),
      findOne: vitest.vi.fn().mockResolvedValue({ id: 'ticket-1' }),
      findEventTicket: vitest.vi.fn().mockResolvedValue([]),
      purchase: vitest.vi.fn().mockResolvedValue({ ticketCode: 'CODE' }),
      cancel: vitest.vi.fn().mockResolvedValue({ message: 'cancelled' }),
      checkIn: vitest.vi.fn().mockResolvedValue({ message: 'checked in' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsServiceController],
      providers: [{ provide: TicketsServiceService, useValue: ticketsService }],
    }).compile();
    controller = module.get(TicketsServiceController);
  });

  vitest.it('returns ticket service liveness', () => {
    vitest.expect(controller.healthCheck()).toEqual({
      status: 'ok',
      service: 'tickets-service',
    });
  });

  vitest.it(
    'delegates ticket list, detail, and event list requests',
    async () => {
      await vitest
        .expect(controller.findMyTickets('user-1'))
        .resolves.toEqual([]);
      await vitest
        .expect(controller.findOne('ticket-1', 'user-1'))
        .resolves.toEqual({
          id: 'ticket-1',
        });
      await vitest
        .expect(controller.findEventTickets('event-1', 'organizer-1'))
        .resolves.toEqual([]);
      vitest.expect(ticketsService.findMyTicket).toHaveBeenCalledWith('user-1');
      vitest
        .expect(ticketsService.findOne)
        .toHaveBeenCalledWith('ticket-1', 'user-1');
      vitest
        .expect(ticketsService.findEventTicket)
        .toHaveBeenCalledWith('event-1', 'organizer-1');
    },
  );

  vitest.it('delegates ticket purchase and cancellation', async () => {
    const purchase = { eventId: 'event-1', quantity: 2 };
    await vitest
      .expect(controller.purchase(purchase, 'user-1'))
      .resolves.toEqual({
        ticketCode: 'CODE',
      });
    await vitest
      .expect(controller.cancel('ticket-1', 'user-1'))
      .resolves.toEqual({
        message: 'cancelled',
      });
    vitest
      .expect(ticketsService.purchase)
      .toHaveBeenCalledWith(purchase, 'user-1');
    vitest
      .expect(ticketsService.cancel)
      .toHaveBeenCalledWith('ticket-1', 'user-1');
  });

  vitest.it(
    'passes ticket code and organizer identity for check-in',
    async () => {
      await vitest
        .expect(controller.checkIn({ ticketCode: 'CODE' }, 'organizer-1'))
        .resolves.toEqual({ message: 'checked in' });
      vitest
        .expect(ticketsService.checkIn)
        .toHaveBeenCalledWith('CODE', 'organizer-1');
    },
  );
});
