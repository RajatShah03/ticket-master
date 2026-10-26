import * as vitest from 'vitest';
import { CreateEventDto, SERVICES_PORTS, UpdateEventDto } from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { EventsService } from './events.service';

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

vitest.describe('EventsService', () => {
  let service: EventsService;
  let http: {
    get: vitest.Mock;
    post: vitest.Mock;
    put: vitest.Mock;
  };
  const baseUrl = `http://localhost:${SERVICES_PORTS.EVENTS_SERVICE}`;

  vitest.beforeEach(async () => {
    http = {
      get: vitest.vi.fn(),
      post: vitest.vi.fn(),
      put: vitest.vi.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: HttpService, useValue: http }, EventsService],
    }).compile();
    service = module.get(EventsService);
  });

  vitest.it(
    'forwards event create, query, update, publish, and cancel requests',
    async () => {
      const responseData = { id: 'event-1' };
      http.post.mockReturnValue(of({ data: responseData }));
      http.get
        .mockReturnValueOnce(of({ data: [responseData] }))
        .mockReturnValueOnce(of({ data: responseData }))
        .mockReturnValueOnce(of({ data: [responseData] }));
      http.put.mockReturnValue(of({ data: responseData }));
      const createData = { title: 'Concert' } as CreateEventDto;
      const updateData = { title: 'Updated' } as UpdateEventDto;

      await vitest
        .expect(service.create(createData, 'user-1', 'ORGANIZER'))
        .resolves.toEqual(responseData);
      await vitest.expect(service.findAll()).resolves.toEqual([responseData]);
      await vitest
        .expect(service.findOne('event-1'))
        .resolves.toEqual(responseData);
      await vitest
        .expect(service.findMyEvents('user-1'))
        .resolves.toEqual([responseData]);
      await vitest
        .expect(service.update('event-1', updateData, 'user-1', 'ADMIN'))
        .resolves.toEqual(responseData);
      await vitest
        .expect(service.publish('event-1', 'user-1', 'ORGANIZER'))
        .resolves.toEqual(responseData);
      await vitest
        .expect(service.cancel('event-1', 'user-1', 'ORGANIZER'))
        .resolves.toEqual(responseData);

      vitest
        .expect(http.post)
        .toHaveBeenNthCalledWith(1, `${baseUrl}`, createData, {
          headers: { 'x-user-id': 'user-1', 'x-user-role': 'ORGANIZER' },
        });
      vitest.expect(http.get).toHaveBeenNthCalledWith(1, `${baseUrl}`);
      vitest.expect(http.get).toHaveBeenNthCalledWith(2, `${baseUrl}/event-1`);
      vitest
        .expect(http.get)
        .toHaveBeenNthCalledWith(3, `${baseUrl}/my-events`, {
          headers: { 'x-user-id': 'user-1' },
        });
      vitest
        .expect(http.put)
        .toHaveBeenCalledWith(`${baseUrl}/event-1`, updateData, {
          headers: { 'x-user-id': 'user-1', 'x-user-role': 'ADMIN' },
        });
      vitest
        .expect(http.post)
        .toHaveBeenNthCalledWith(2, `${baseUrl}/event-1/publish`, null, {
          headers: { 'x-user-id': 'user-1', 'x-user-role': 'ORGANIZER' },
        });
      vitest
        .expect(http.post)
        .toHaveBeenNthCalledWith(3, `${baseUrl}/event-1/cancel`, null, {
          headers: { 'x-user-id': 'user-1', 'x-user-role': 'ORGANIZER' },
        });
    },
  );

  vitest.it('maps HTTP errors from every upstream request', async () => {
    const upstream = Object.assign(new Error('Bad request'), {
      response: { status: 400, data: { message: 'Invalid event' } },
    });
    http.post.mockReturnValue(throwError(() => upstream));
    http.get.mockReturnValue(throwError(() => upstream));
    http.put.mockReturnValue(throwError(() => upstream));
    const createData = { title: 'Concert' } as CreateEventDto;
    const updateData = { title: 'Updated' } as UpdateEventDto;
    const requests = [
      service.create(createData, 'user-1', 'USER'),
      service.findAll(),
      service.findOne('event-1'),
      service.findMyEvents('user-1'),
      service.update('event-1', updateData, 'user-1', 'USER'),
      service.publish('event-1', 'user-1', 'USER'),
      service.cancel('event-1', 'user-1', 'USER'),
    ];
    for (const request of requests) {
      await expectHttpError(request, 400, 'Invalid event');
    }
  });

  vitest.it(
    'preserves response bodies and applies upstream and fallback messages',
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
            response: { status: 503, data: null },
          }),
          status: 503,
          response: 'Request failed',
        },
        {
          error: Object.assign(new Error('network'), { response: undefined }),
          status: 500,
          response: 'Internal server error',
        },
        {
          error: { message: 'not an Error instance' },
          status: 500,
          response: 'Internal server error',
        },
      ];

      for (const testCase of cases) {
        http.get.mockReturnValueOnce(throwError(() => testCase.error));
        await expectHttpError(
          service.findOne('event-1'),
          testCase.status,
          testCase.response,
        );
      }
    },
  );
});
