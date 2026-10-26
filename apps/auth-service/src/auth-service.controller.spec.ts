import * as vitest from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthServiceService } from './auth-service.service';
import { AuthServiceController } from './auth-service.controller';

vitest.describe('AuthServiceController', () => {
  let controller: AuthServiceController;
  let authService: {
    register: vitest.Mock;
    login: vitest.Mock;
    getProfile: vitest.Mock;
  };

  vitest.beforeEach(async () => {
    authService = {
      register: vitest.vi.fn().mockResolvedValue({ userId: 'user-1' }),
      login: vitest.vi.fn().mockResolvedValue({ access_token: 'token' }),
      getProfile: vitest.vi.fn().mockResolvedValue({ id: 'user-1' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthServiceController],
      providers: [{ provide: AuthServiceService, useValue: authService }],
    }).compile();

    controller = module.get(AuthServiceController);
  });

  vitest.it('returns auth service liveness', () => {
    vitest.expect(controller.healthCheck()).toEqual({
      status: 'ok',
      service: 'auth-service',
    });
  });

  vitest.it('passes registration fields to the auth service', async () => {
    const dto = {
      email: 'person@example.com',
      password: 'secret',
      name: 'Person',
    };
    await vitest
      .expect(controller.register(dto))
      .resolves.toEqual({ userId: 'user-1' });
    vitest
      .expect(authService.register)
      .toHaveBeenCalledWith(dto.email, dto.password, dto.name);
  });

  vitest.it('passes login fields to the auth service', async () => {
    const dto = { email: 'person@example.com', password: 'secret' };
    await vitest.expect(controller.login(dto)).resolves.toEqual({
      access_token: 'token',
    });
    vitest
      .expect(authService.login)
      .toHaveBeenCalledWith(dto.email, dto.password);
  });

  vitest.it('loads the profile for the authenticated user', async () => {
    await vitest
      .expect(controller.getProfile({ user: { userId: 'user-1' } }))
      .resolves.toEqual({ id: 'user-1' });
    vitest.expect(authService.getProfile).toHaveBeenCalledWith('user-1');
  });
});
