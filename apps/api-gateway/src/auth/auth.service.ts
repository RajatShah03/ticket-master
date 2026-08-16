import { RegisterData, RegisteredUser, SERVICES_PORTS } from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AuthService {
  private readonly authServiceUrl = `http://localhost:${SERVICES_PORTS.AUTH_SERVICE}`;

  constructor(private readonly httpService: HttpService) {}

  async register(data: RegisterData): Promise<RegisteredUser> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<RegisteredUser>(
          `${this.authServiceUrl}/register`,
          data,
        ),
      );

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async login(data: Pick<RegisterData, 'email' | 'password'>) {
    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          access_token: string;
          user: {
            id: string;
            email: string;
            name: string;
            role: string;
          };
        }>(`${this.authServiceUrl}/login`, data),
      );

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getProfile(token: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{
          id: string;
          name: string;
          email: string;
          role: string;
        }>(`${this.authServiceUrl}/profile`, {
          headers: {
            Authorization: token,
          },
        }),
      );

      return response.data;
    } catch (error: unknown) {
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
