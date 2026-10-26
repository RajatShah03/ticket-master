import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { LoginDto, RegisterDto } from '@app/common';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'auth-service',
    };
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    const { email, password, name } = dto;
    return this.authServiceService.register(email, password, name);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    const { email, password } = dto;
    return this.authServiceService.login(email, password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: { user: { userId: string } }) {
    return this.authServiceService.getProfile(req.user.userId);
  }
}
