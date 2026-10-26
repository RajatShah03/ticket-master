import * as vitest from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsServiceService } from './notifications-service.service';
import { NotificationsServiceController } from './notifications-service.controller';

vitest.describe('NotificationsServiceController', () => {
  let controller: NotificationsServiceController;
  let notificationsService: {
    sendWelcomeEmail: vitest.Mock;
    sendTicketPurchasedEmail: vitest.Mock;
    sendTicketCancelEmail: vitest.Mock;
  };

  vitest.beforeEach(async () => {
    notificationsService = {
      sendWelcomeEmail: vitest.vi.fn().mockResolvedValue(undefined),
      sendTicketPurchasedEmail: vitest.vi.fn().mockResolvedValue(undefined),
      sendTicketCancelEmail: vitest.vi.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsServiceController],
      providers: [
        {
          provide: NotificationsServiceService,
          useValue: notificationsService,
        },
      ],
    }).compile();
    controller = module.get(NotificationsServiceController);
  });

  vitest.it('returns notification service liveness', () => {
    vitest.expect(controller.healthCheck()).toEqual({
      status: 'ok',
      service: 'notifications-service',
    });
  });

  vitest.it('handles user registration events', async () => {
    const data = {
      userId: 'user-1',
      name: 'Person',
      email: 'person@example.com',
    };
    await controller.handleUserRegistered(data);
    vitest
      .expect(notificationsService.sendWelcomeEmail)
      .toHaveBeenCalledWith(data);
  });

  vitest.it('handles ticket purchase events', async () => {
    const data = {
      ticketId: 'ticket-1',
      ticketCode: 'CODE',
      userId: 'user-1',
      email: 'person@example.com',
      quantity: 2,
      totalPrice: 50,
    };
    await controller.handleTicketPurchased(data);
    vitest
      .expect(notificationsService.sendTicketPurchasedEmail)
      .toHaveBeenCalledWith(data);
  });

  vitest.it('handles ticket cancellation events', async () => {
    const data = {
      eventId: 'event-1',
      email: 'person@example.com',
    };
    await controller.handleTicketCancelled(data);
    vitest
      .expect(notificationsService.sendTicketCancelEmail)
      .toHaveBeenCalledWith(data);
  });
});
