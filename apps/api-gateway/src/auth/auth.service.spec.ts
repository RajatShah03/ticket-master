import * as vitest from 'vitest';
import { SERVICES_PORTS } from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';

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

vitest.describe('AuthService', () => {
  let service: AuthService;
  let http: { get: vitest.Mock; post: vitest.Mock };
  const baseUrl = `http://localhost:${SERVICES_PORTS.AUTH_SERVICE}`;

  vitest.beforeEach(async () => {
    http = { get: vitest.vi.fn(), post: vitest.vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: HttpService, useValue: http }, AuthService],
    }).compile();
    service = module.get(AuthService);
  });

  vitest.it('proxies register, login, and profile requests', async () => {
    const response = { id: 'user-1', email: 'person@example.com' };
    http.post.mockReturnValue(of({ data: response }));
    http.get.mockReturnValue(of({ data: response }));
    const registration = {
      email: 'person@example.com',
      password: 'secret',
      name: 'Person',
    };
    const login = {
      email: registration.email,
      password: registration.password,
    };

    await vitest
      .expect(service.register(registration))
      .resolves.toEqual(response);
    await vitest.expect(service.login(login)).resolves.toEqual(response);
    await vitest
      .expect(service.getProfile('Bearer token'))
      .resolves.toEqual(response);
    vitest
      .expect(http.post)
      .toHaveBeenNthCalledWith(1, `${baseUrl}/register`, registration);
    vitest
      .expect(http.post)
      .toHaveBeenNthCalledWith(2, `${baseUrl}/login`, login);
    vitest.expect(http.get).toHaveBeenCalledWith(`${baseUrl}/profile`, {
      headers: { Authorization: 'Bearer token' },
    });
  });

  vitest.it('maps upstream HTTP errors for each auth operation', async () => {
    const upstream = Object.assign(new Error('Unauthorized'), {
      response: { status: 401, data: { message: 'Invalid credentials' } },
    });
    http.post.mockReturnValue(throwError(() => upstream));
    http.get.mockReturnValue(throwError(() => upstream));
    const registration = {
      email: 'person@example.com',
      password: 'secret',
      name: 'Person',
    };
    const login = {
      email: registration.email,
      password: registration.password,
    };

    await expectHttpError(
      service.register(registration),
      401,
      'Invalid credentials',
    );
    await expectHttpError(service.login(login), 401, 'Invalid credentials');
    await expectHttpError(
      service.getProfile('Bearer token'),
      401,
      'Invalid credentials',
    );
  });

  vitest.it('handles upstream response bodies and unknown errors', async () => {
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
      http.post.mockReturnValueOnce(throwError(() => testCase.error));
      await expectHttpError(
        service.login({ email: 'person@example.com', password: 'secret' }),
        testCase.status,
        testCase.response,
      );
    }
  });
});
