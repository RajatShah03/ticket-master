import * as vitest from 'vitest';
import { SERVICES_PORTS } from '@app/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

vitest.describe('AppService', () => {
  let service: AppService;

  vitest.beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();
    service = module.get(AppService);
  });

  vitest.it('reports the configured API gateway port', () => {
    vitest
      .expect(service.getHello())
      .toBe(
        `[PORT]: API Gateway is running on port ${SERVICES_PORTS.API_GATEWAY}`,
      );
  });
});
