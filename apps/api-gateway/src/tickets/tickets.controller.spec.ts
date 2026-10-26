import * as vitest from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';

vitest.describe('TicketsController', () => {
  let controller: TicketsController;
  let ticketsService: Record<string, vitest.Mock>;

  vitest.beforeEach(async () => {
    ticketsService = {
      purchase: vitest.vi.fn().mockResolvedValue({ ticket: {} }),
      findMyTickets: vitest.vi.fn().mockResolvedValue([]),
      findOne: vitest.vi.fn().mockResolvedValue({ id: 'ticket-1' }),
      cancel: vitest.vi.fn().mockResolvedValue({ message: 'cancelled' }),
      checkIn: vitest.vi.fn().mockResolvedValue({ message: 'checked in' }),
      findEventTickets: vitest.vi.fn().mockResolvedValue([]),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: ticketsService }],
    }).compile();
    controller = module.get(TicketsController);
  });

  vitest.it(
    'delegates ticket purchase using authenticated user id',
    async () => {
      const purchase = { eventId: 'event-1', quantity: 2 };
      await vitest
        .expect(controller.purchase(purchase, { user: { userId: 'user-1' } }))
        .resolves.toEqual({ ticket: {} });
      vitest
        .expect(ticketsService.purchase)
        .toHaveBeenCalledWith(purchase, 'user-1');
    },
  );

  vitest.it('delegates ticket list and detail queries', async () => {
    const request = { user: { userId: 'user-1' } };
    await vitest.expect(controller.findMyTickets(request)).resolves.toEqual([]);
    await vitest
      .expect(controller.findOne('ticket-1', request))
      .resolves.toEqual({ id: 'ticket-1' });
    vitest.expect(ticketsService.findMyTickets).toHaveBeenCalledWith('user-1');
    vitest
      .expect(ticketsService.findOne)
      .toHaveBeenCalledWith('ticket-1', 'user-1');
  });

  vitest.it('delegates cancellation and check-in', async () => {
    const request = { user: { userId: 'organizer-1' } };
    const checkIn = { ticketCode: 'CODE' };
    await vitest
      .expect(controller.cancel('ticket-1', request))
      .resolves.toEqual({ message: 'cancelled' });
    await vitest
      .expect(controller.checkIn(checkIn, request))
      .resolves.toEqual({ message: 'checked in' });
    vitest
      .expect(ticketsService.cancel)
      .toHaveBeenCalledWith('ticket-1', 'organizer-1');
    vitest
      .expect(ticketsService.checkIn)
      .toHaveBeenCalledWith(checkIn, 'organizer-1');
  });

  vitest.it('delegates event ticket lookup', async () => {
    const request = { user: { userId: 'organizer-1' } };
    await vitest
      .expect(controller.findEventTickets('event-1', request))
      .resolves.toEqual([]);
    vitest
      .expect(ticketsService.findEventTickets)
      .toHaveBeenCalledWith('event-1', 'organizer-1');
  });
});
