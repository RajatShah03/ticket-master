import {
  CheckInTicketDto,
  CheckInTicketResponse,
  PurchaseTicketDto,
  PurchaseTicketResponse,
  SERVICES_PORTS,
  TicketActionResponse,
  TicketDetails,
  TicketResponse,
  TicketSummary,
} from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TicketsService {
  private readonly ticketServiceUrl = `http:localhost:${SERVICES_PORTS.TICKETS_SERVICE}`;

  constructor(private readonly httpService: HttpService) {}

  async purchase(
    data: PurchaseTicketDto,
    userId: string,
  ): Promise<PurchaseTicketResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<PurchaseTicketResponse>(
          `${this.ticketServiceUrl}/purchase`,
          data,
          {
            headers: {
              'x-user-id': userId,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findMyTickets(userId: string): Promise<TicketSummary[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TicketSummary[]>(
          `${this.ticketServiceUrl}/my-tickets`,
          {
            headers: {
              'x-user-id': userId,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findOne(id: string, userId: string): Promise<TicketDetails> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TicketDetails>(`${this.ticketServiceUrl}/${id}`, {
          headers: {
            'x-user-id': userId,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findEventTickets(
    eventId: string,
    organizerId: string,
  ): Promise<TicketResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TicketResponse[]>(
          `${this.ticketServiceUrl}/event/${eventId}`,
          {
            headers: {
              'x-user-id': organizerId,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancel(id: string, userId: string): Promise<TicketActionResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<TicketActionResponse>(
          `${this.ticketServiceUrl}/${id}`,
          {},
          {
            headers: {
              'x-user-id': userId,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async checkIn(
    data: CheckInTicketDto,
    organizerId: string,
  ): Promise<CheckInTicketResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<CheckInTicketResponse>(
          `${this.ticketServiceUrl}/check-in`,
          data,
          {
            headers: {
              'x-user-id': organizerId,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as AxiosError<{ message?: string }>;

      if (axiosError.response) {
        throw new HttpException(
          axiosError.response.data?.message ??
            axiosError.response.data ??
            'Request failed',
          axiosError.response.status,
        );
      }
    }

    throw new HttpException('Internal server error', 500);
  }
}
