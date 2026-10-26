import * as vitest from 'vitest';
import { SERVICES_PORTS } from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { TicketsService } from './tickets.service';

async function expectHttpError(
  promise: Promise<unknown>,
  status: number,
  response: unknown,
) {
  const error = await promise.catch((reason: unknown) => reason);
  vitest.expect(error).toBeInstanceOf(HttpException);
  if (!(error instanceof HttpException)) {
    throw error;
  }
  vitest.expect(error.getStatus()).toBe(status);
  vitest.expect(error.getResponse()).toEqual(response);
}

vitest.describe('TicketsService', () => {
  let service: TicketsService;
  let http: { get: vitest.Mock; post: vitest.Mock };
  const baseUrl = `http://localhost:${SERVICES_PORTS.TICKETS_SERVICE}`;

  vitest.beforeEach(async () => {
    http = { get: vitest.vi.fn(), post: vitest.vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: HttpService, useValue: http }, TicketsService],
    }).compile();
    service = module.get(TicketsService);
  });

  vitest.it(
    'forwards ticket purchase, list, detail, cancel, and check-in requests',
    async () => {
      const item = { id: 'ticket-1' };
      http.get
        .mockReturnValueOnce(of({ data: [item] }))
        .mockReturnValueOnce(of({ data: item }))
        .mockReturnValueOnce(of({ data: [item] }));
      http.post.mockReturnValue(of({ data: item }));
      const purchase = { eventId: 'event-1', quantity: 2 };
      const checkIn = { ticketCode: 'CODE' };

      await vitest
        .expect(service.purchase(purchase, 'user-1'))
        .resolves.toEqual(item);
      await vitest
        .expect(service.findMyTickets('user-1'))
        .resolves.toEqual([item]);
      await vitest
        .expect(service.findOne('ticket-1', 'user-1'))
        .resolves.toEqual(item);
      await vitest
        .expect(service.findEventTickets('event-1', 'organizer-1'))
        .resolves.toEqual([item]);
      await vitest
        .expect(service.cancel('ticket-1', 'user-1'))
        .resolves.toEqual(item);
      await vitest
        .expect(service.checkIn(checkIn, 'organizer-1'))
        .resolves.toEqual(item);

      vitest
        .expect(http.post)
        .toHaveBeenNthCalledWith(1, `${baseUrl}/purchase`, purchase, {
          headers: { 'x-user-id': 'user-1' },
        });
      vitest
        .expect(http.get)
        .toHaveBeenNthCalledWith(1, `${baseUrl}/my-tickets`, {
          headers: { 'x-user-id': 'user-1' },
        });
      vitest
        .expect(http.get)
        .toHaveBeenNthCalledWith(2, `${baseUrl}/ticket-1`, {
          headers: { 'x-user-id': 'user-1' },
        });
      vitest
        .expect(http.get)
        .toHaveBeenNthCalledWith(3, `${baseUrl}/event/event-1`, {
          headers: { 'x-user-id': 'organizer-1' },
        });
      vitest
        .expect(http.post)
        .toHaveBeenNthCalledWith(
          2,
          `${baseUrl}/ticket-1/cancel`,
          {},
          { headers: { 'x-user-id': 'user-1' } },
        );
      vitest
        .expect(http.post)
        .toHaveBeenNthCalledWith(3, `${baseUrl}/check-in`, checkIn, {
          headers: { 'x-user-id': 'organizer-1' },
        });
    },
  );

  vitest.it('maps upstream HTTP errors for every proxy method', async () => {
    const upstream = Object.assign(new Error('Bad request'), {
      response: { status: 403, data: { message: 'Forbidden' } },
    });
    http.get.mockReturnValue(throwError(() => upstream));
    http.post.mockReturnValue(throwError(() => upstream));
    const purchase = { eventId: 'event-1', quantity: 1 };
    const checkIn = { ticketCode: 'CODE' };
    const requests = [
      service.purchase(purchase, 'user-1'),
      service.findMyTickets('user-1'),
      service.findOne('ticket-1', 'user-1'),
      service.findEventTickets('event-1', 'organizer-1'),
      service.cancel('ticket-1', 'user-1'),
      service.checkIn(checkIn, 'organizer-1'),
    ];
    for (const request of requests) {
      await expectHttpError(request, 403, 'Forbidden');
    }
  });

  vitest.it(
    'uses response data or fallback errors when the upstream has no message',
    async () => {
      const cases = [
        {
          error: Object.assign(new Error('upstream'), {
            response: { status: 422, data: { reason: 'invalid' } },
          }),
          status: 422,
          response: { reason: 'invalid' },
        },
        {
          error: Object.assign(new Error('upstream'), {
            response: { status: 502, data: null },
          }),
          status: 502,
          response: 'Request failed',
        },
        {
          error: Object.assign(new Error('network'), { response: undefined }),
          status: 500,
          response: 'Internal server error',
        },
        {
          error: 'not an Error instance',
          status: 500,
          response: 'Internal server error',
        },
      ];

      for (const testCase of cases) {
        http.get.mockReturnValueOnce(throwError(() => testCase.error));
        await expectHttpError(
          service.findMyTickets('user-1'),
          testCase.status,
          testCase.response,
        );
      }
    },
  );
});
