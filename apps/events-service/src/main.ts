import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { EventsServiceModule } from './events-service.module';
import { SERVICES_PORTS } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(EventsServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(SERVICES_PORTS.EVENTS_SERVICE);
  console.log(`Events Service: ${SERVICES_PORTS.EVENTS_SERVICE}`);
}
bootstrap();
