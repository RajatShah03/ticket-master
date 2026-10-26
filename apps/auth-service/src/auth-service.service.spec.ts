import * as vitest from 'vitest';
import { DatabaseService, users } from '@app/database';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthServiceService } from './auth-service.service';
import { vi } from 'vitest';

const bcryptMocks = vi.hoisted(() => ({
  hash: vi.fn<(password: string, saltOrRounds: number) => Promise<string>>(),
  compare: vi.fn<(data: string, encrypted: string) => Promise<boolean>>(),
}));

vi.mock('bcrypt', () => bcryptMocks);

function selectQuery(result: unknown[]) {
  const query = {
    from: vitest.vi.fn(),
    where: vitest.vi.fn(),
    limit: vitest.vi.fn().mockResolvedValue(result),
    then: (
      onfulfilled: (value: unknown[]) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return query;
}

vitest.describe('AuthServiceService', () => {
  let service: AuthServiceService;
  let db: { select: vitest.Mock; insert: vitest.Mock };
  let kafka: {
    connect: vitest.Mock<() => Promise<void>>;
    emit: vitest.Mock<
      (topic: string, payload: Record<string, unknown>) => void
    >;
  };
  let jwt: { sign: vitest.Mock };

  vitest.beforeEach(async () => {
    db = { select: vitest.vi.fn(), insert: vitest.vi.fn() };
    kafka = {
      connect: vitest.vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      emit: vitest.vi.fn<
        (topic: string, payload: Record<string, unknown>) => void
      >(),
    };
    jwt = { sign: vitest.vi.fn().mockReturnValue('signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServiceService,
        { provide: KAFKA_SERVICE, useValue: kafka },
        { provide: DatabaseService, useValue: { db } },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthServiceService);
  });

  vitest.afterEach(() => vitest.vi.restoreAllMocks());

  vitest.it('connects to Kafka when initialized', async () => {
    await service.onModuleInit();
    vitest.expect(kafka.connect).toHaveBeenCalledTimes(1);
  });

  vitest.it(
    'rejects registration when the email is already in use',
    async () => {
      db.select.mockReturnValue(selectQuery([{ id: 'user-1' }]));

      await vitest
        .expect(service.register('person@example.com', 'password', 'Person'))
        .rejects.toBeInstanceOf(ConflictException);
      vitest.expect(db.insert).not.toHaveBeenCalled();
    },
  );

  vitest.it(
    'hashes the password, creates a user, and publishes registration',
    async () => {
      bcryptMocks.hash.mockResolvedValue('hashed-password');
      db.select.mockReturnValue(selectQuery([]));
      const createdUser = {
        id: 'user-1',
        email: 'person@example.com',
        name: 'Person',
        password: 'hashed-password',
      };
      const returning = vitest.vi.fn().mockResolvedValue([createdUser]);
      const values = vitest.vi.fn().mockReturnValue({ returning });
      db.insert.mockReturnValue({ values });

      await vitest
        .expect(service.register('person@example.com', 'password', 'Person'))
        .resolves.toEqual({
          message: 'User registered successfully',
          userId: 'user-1',
        });
      vitest.expect(bcryptMocks.hash).toHaveBeenCalledWith('password', 10);
      vitest.expect(db.insert).toHaveBeenCalledWith(users);
      vitest.expect(values).toHaveBeenCalledWith({
        email: 'person@example.com',
        password: 'hashed-password',
        name: 'Person',
      });
      vitest.expect(kafka.emit).toHaveBeenCalledWith(
        KAFKA_TOPICS.USER_REGISTERED,
        vitest.expect.objectContaining({
          userId: 'user-1',
          email: 'person@example.com',
          name: 'Person',
        }),
      );
      vitest
        .expect(typeof kafka.emit.mock.calls[0]?.[1].timestamp)
        .toBe('string');
    },
  );

  vitest.it('rejects login for an unknown email', async () => {
    db.select.mockReturnValue(selectQuery([]));
    await vitest
      .expect(service.login('missing@example.com', 'password'))
      .rejects.toBeInstanceOf(UnauthorizedException);
    vitest.expect(jwt.sign).not.toHaveBeenCalled();
  });

  vitest.it('rejects login when the password does not match', async () => {
    db.select.mockReturnValue(
      selectQuery([
        { id: 'user-1', email: 'person@example.com', password: 'hash' },
      ]),
    );
    bcryptMocks.compare.mockResolvedValue(false);

    await vitest
      .expect(service.login('person@example.com', 'wrong-password'))
      .rejects.toBeInstanceOf(UnauthorizedException);
    vitest.expect(jwt.sign).not.toHaveBeenCalled();
  });

  vitest.it('signs in a user and publishes the login event', async () => {
    const user = {
      id: 'user-1',
      email: 'person@example.com',
      name: 'Person',
      role: 'USER',
      password: 'hash',
    };
    db.select.mockReturnValue(selectQuery([user]));
    bcryptMocks.compare.mockResolvedValue(true);

    await vitest
      .expect(service.login('person@example.com', 'password'))
      .resolves.toEqual({
        message: 'Login successful',
        access_token: 'signed-token',
        user: {
          id: 'user-1',
          email: 'person@example.com',
          name: 'Person',
          role: 'USER',
        },
      });
    vitest.expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'person@example.com',
    });
    vitest.expect(kafka.emit).toHaveBeenCalledWith(
      KAFKA_TOPICS.USER_LOGIN,
      vitest.expect.objectContaining({
        userId: 'user-1',
      }),
    );
    vitest
      .expect(typeof kafka.emit.mock.calls[0]?.[1].timestamp)
      .toBe('string');
  });

  vitest.it('returns profile details for an existing user', async () => {
    const profile = {
      id: 'user-1',
      email: 'person@example.com',
      name: 'Person',
      role: 'USER',
    };
    db.select.mockReturnValue(selectQuery([profile]));

    await vitest.expect(service.getProfile('user-1')).resolves.toEqual(profile);
  });

  vitest.it('rejects profile lookup for an unknown user', async () => {
    db.select.mockReturnValue(selectQuery([]));
    await vitest
      .expect(service.getProfile('missing'))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
