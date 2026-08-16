import { SERVICES_PORTS } from '@app/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthServiceService {
  getHello(): string {
    return `[PORT]: Auth Service is running on port ${SERVICES_PORTS.AUTH_SERVICE}`;
  }
}
