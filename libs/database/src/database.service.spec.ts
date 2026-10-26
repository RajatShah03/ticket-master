import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as schema from './schema';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let module: TestingModule;
  let service: DatabaseService;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    module = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();
    service = module.get(DatabaseService);
  });

  afterEach(async () => {
    await module.close();
    vi.restoreAllMocks();
  });

  it('exposes the initialized Drizzle client and schema', () => {
    expect(service.db).toBeDefined();
    expect(service.schema).toBe(schema);
  });

  it('closes the PostgreSQL pool during module shutdown', async () => {
    const poolEnd = vi
      .spyOn(service['pool'], 'end')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(poolEnd).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      '[DatabaseService] Database connection closed',
    );
  });
});
