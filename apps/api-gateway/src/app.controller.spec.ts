import * as vitest from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

vitest.describe('AppController', () => {
  let controller: AppController;
  let appService: { getHello: vitest.Mock };

  vitest.beforeEach(async () => {
    appService = {
      getHello: vitest.vi.fn().mockReturnValue('gateway is running'),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appService }],
    }).compile();

    controller = module.get(AppController);
  });

  vitest.it('delegates the root endpoint to AppService', () => {
    vitest.expect(controller.getHello()).toBe('gateway is running');
    vitest.expect(appService.getHello).toHaveBeenCalledTimes(1);
  });

  vitest.it('returns the gateway liveness status', () => {
    vitest.expect(controller.healthCheck()).toEqual({
      status: 'ok',
      service: 'api-gateway',
    });
  });
});
