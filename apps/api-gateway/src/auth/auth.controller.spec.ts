import * as vitest from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

vitest.describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: vitest.Mock;
    login: vitest.Mock;
    getProfile: vitest.Mock;
  };

  vitest.beforeEach(async () => {
    authService = {
      register: vitest.vi.fn().mockResolvedValue({ id: 'user-1' }),
      login: vitest.vi.fn().mockResolvedValue({ access_token: 'token' }),
      getProfile: vitest.vi.fn().mockResolvedValue({ id: 'user-1' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = module.get(AuthController);
  });

  vitest.it('passes registration data to the auth service', async () => {
    const data = {
      email: 'person@example.com',
      password: 'secret',
      name: 'Person',
    };
    await vitest.expect(controller.register(data)).resolves.toEqual({
      id: 'user-1',
    });
    vitest.expect(authService.register).toHaveBeenCalledWith(data);
  });

  vitest.it('passes login data to the auth service', async () => {
    const data = { email: 'person@example.com', password: 'secret' };
    await vitest.expect(controller.login(data)).resolves.toEqual({
      access_token: 'token',
    });
    vitest.expect(authService.login).toHaveBeenCalledWith(data);
  });

  vitest.it('passes the authorization token to profile lookup', async () => {
    await vitest
      .expect(controller.getProfile('Bearer token'))
      .resolves.toEqual({
        id: 'user-1',
      });
    vitest.expect(authService.getProfile).toHaveBeenCalledWith('Bearer token');
  });
});
