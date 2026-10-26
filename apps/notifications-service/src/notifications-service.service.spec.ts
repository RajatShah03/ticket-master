import * as vitest from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { NotificationsServiceService } from './notifications-service.service';

vitest.describe('NotificationsServiceService', () => {
  let service: NotificationsServiceService;
  let emailService: { sendEmail: vitest.Mock };

  vitest.beforeEach(async () => {
    emailService = { sendEmail: vitest.vi.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsServiceService,
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();
    service = module.get(NotificationsServiceService);
  });

  vitest.it(
    'sends a welcome email with escaped user-provided name',
    async () => {
      await service.sendWelcomeEmail({
        userId: 'user-1',
        name: '<Pat & "Sam">',
        email: 'person@example.com',
      });
      vitest
        .expect(emailService.sendEmail)
        .toHaveBeenCalledWith(
          'person@example.com',
          'Welcome to Ticket-Master',
          vitest.expect.stringContaining(
            'Welcome aboard, &lt;Pat &amp; &quot;Sam&quot;&gt;!',
          ),
        );
    },
  );

  vitest.it(
    'sends a purchase confirmation including optional event details',
    async () => {
      await service.sendTicketPurchasedEmail({
        userId: 'user-1',
        email: 'person@example.com',
        ticketCode: 'CODE&123',
        eventTitle: '<Concert>',
        eventDate: 'Jan 1',
        eventLocation: 'Main Hall',
        quantity: 1,
        totalPrice: 45.5,
      });

      const [, subject, html] = emailService.sendEmail.mock.calls[0] as [
        string,
        string,
        string,
      ];
      vitest.expect(subject).toBe('Booking Confirmation!');
      vitest.expect(html).toContain('&lt;Concert&gt;');
      vitest.expect(html).toContain('Jan 1');
      vitest.expect(html).toContain('Main Hall');
      vitest.expect(html).toContain('1 ticket');
      vitest.expect(html).toContain('45.50');
      vitest.expect(html).toContain('CODE&amp;123');
    },
  );

  vitest.it(
    'omits optional event details and pluralizes ticket quantities',
    async () => {
      await service.sendTicketPurchasedEmail({
        userId: 'user-1',
        email: 'person@example.com',
        ticketCode: 'CODE',
        quantity: 3,
        totalPrice: 120,
      });

      const html = emailService.sendEmail.mock.calls[0][2] as string;
      vitest.expect(html).toContain('3 tickets');
      vitest.expect(html).not.toContain('<td>Date</td>');
      vitest.expect(html).not.toContain('<td>Location</td>');
    },
  );

  vitest.it(
    'sends a cancellation email with optional event information escaped',
    async () => {
      await service.sendTicketCancelEmail({
        eventId: 'event-1',
        eventTitle: "Sam's <Show>",
        eventDate: 'Jan 1',
        email: 'person@example.com',
      });
      vitest
        .expect(emailService.sendEmail)
        .toHaveBeenCalledWith(
          'person@example.com',
          'Ticket Cancellation!',
          vitest.expect.stringContaining('Sam&#39;s &lt;Show&gt;'),
        );
      vitest
        .expect(emailService.sendEmail.mock.calls[0][2])
        .toContain('Event date: Jan 1');
    },
  );

  vitest.it(
    'sends a cancellation email without optional event information',
    async () => {
      await service.sendTicketCancelEmail({
        eventId: 'event-1',
        email: 'person@example.com',
      });
      const html = emailService.sendEmail.mock.calls[0][2] as string;
      vitest.expect(html).toContain('your ticket has been cancelled');
      vitest.expect(html).not.toContain('Event date:');
    },
  );
});
