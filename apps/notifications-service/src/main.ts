import { NestFactory } from '@nestjs/core';
import { NotificationsServiceModule } from './notifications-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKER, KAFKA_CLIENT_ID } from '@app/kafka';
import { SERVICES_PORTS } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(NotificationsServiceModule);

  // Explain
  // Connect kafka microservices for consuming events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: `${KAFKA_CLIENT_ID}-notifications`,
        brokers: [KAFKA_BROKER],
      },
      consumer: {
        groupId: `notifications-consumer-group`,
      },
    },
  });

  // Explain
  // start microservices (kafka consumers)
  await app.startAllMicroservices();
  console.log('Kafka Consumer Started...');

  await app.listen(SERVICES_PORTS.NOTIFICATIONS_SERVICE);
  console.log(`Notifications Service: ${SERVICES_PORTS.NOTIFICATIONS_SERVICE}`);
}
bootstrap();
