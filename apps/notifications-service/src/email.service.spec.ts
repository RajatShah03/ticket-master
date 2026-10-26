import * as vitest from 'vitest';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

vitest.describe('EmailService', () => {
  let service: EmailService;

  vitest.beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();
    service = module.get(EmailService);
  });

  vitest.afterEach(() => vitest.vi.restoreAllMocks());

  vitest.it('creates the SMTP transport when the module initializes', () => {
    const log = vitest.vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    service.onModuleInit();

    vitest.expect(service['transporter']).toBeDefined();
    vitest.expect(log).toHaveBeenCalledWith('Email service initialized...');
  });

  vitest.it(
    'sends the requested message through the configured transport',
    async () => {
      const sendMail = vitest.vi
        .fn()
        .mockResolvedValue({ messageId: 'message-1' });
      Object.defineProperty(service, 'transporter', {
        configurable: true,
        value: { sendMail },
      });
      const log = vitest.vi
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);

      await service.sendEmail(
        'person@example.com',
        'Subject',
        '<p>Message</p>',
      );

      vitest.expect(sendMail).toHaveBeenCalledWith({
        from: 'Ticket-Master',
        to: 'person@example.com',
        subject: 'Subject',
        html: '<p>Message</p>',
      });
      vitest
        .expect(log)
        .toHaveBeenCalledWith('Email sent to person@example.com');
    },
  );

  vitest.it(
    'logs transport errors instead of rejecting the notification flow',
    async () => {
      const error = new Error('SMTP unavailable');
      const sendMail = vitest.vi.fn().mockRejectedValue(error);
      Object.defineProperty(service, 'transporter', {
        configurable: true,
        value: { sendMail },
      });
      const logError = vitest.vi
        .spyOn(service['logger'], 'error')
        .mockImplementation(() => undefined);

      await vitest
        .expect(
          service.sendEmail('person@example.com', 'Subject', '<p>Message</p>'),
        )
        .resolves.toBeUndefined();
      vitest
        .expect(logError)
        .toHaveBeenCalledWith(
          `Error sending email to person@example.com: ${error}`,
        );
    },
  );
});
