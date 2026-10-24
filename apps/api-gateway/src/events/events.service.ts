import {
  CreateEventDto,
  EventResponse,
  SERVICES_PORTS,
  UpdateEventDto,
} from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EventsService {
  private readonly eventServiceUrl = `http://localhost:${SERVICES_PORTS.EVENTS_SERVICE}`;

  constructor(private readonly httpService: HttpService) {}

  async create(
    data: CreateEventDto,
    userId: string,
    userRole: string,
  ): Promise<EventResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<EventResponse>(`${this.eventServiceUrl}`, data, {
          headers: {
            'x-user-id': userId,
            'x-user-role': userRole,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findAll(): Promise<EventResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<EventResponse[]>(`${this.eventServiceUrl}`),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findOne(id: string): Promise<EventResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<EventResponse>(`${this.eventServiceUrl}/${id}`),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findMyEvents(userId: string): Promise<EventResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<EventResponse[]>(
          `${this.eventServiceUrl}/my-events`,
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

  async update(
    id: string,
    data: UpdateEventDto,
    userId: string,
    userRole: string,
  ): Promise<EventResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.put<EventResponse>(
          `${this.eventServiceUrl}/${id}`,
          data,
          {
            headers: {
              'x-user-id': userId,
              'x-user-role': userRole,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async publish(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<EventResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<EventResponse>(
          `${this.eventServiceUrl}/${id}/publish`,
          null,
          {
            headers: {
              'x-user-id': userId,
              'x-user-role': userRole,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancel(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<EventResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<EventResponse>(
          `${this.eventServiceUrl}/${id}/cancel`,
          null,
          {
            headers: {
              'x-user-id': userId,
              'x-user-role': userRole,
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
