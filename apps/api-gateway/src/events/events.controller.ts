import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateEventDto, UpdateEventDto } from '@app/common';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Public

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  // Protected

  @UseGuards(AuthGuard('jwt'))
  @Get('my-events')
  findMyEvents(@Request() req: { user: { userId: string } }) {
    return this.eventsService.findMyEvents(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() data: CreateEventDto,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.eventsService.create(
      data,
      req.user.userId,
      req.user.role || 'USER',
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateEventDto,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.eventsService.update(
      id,
      data,
      req.user.userId,
      req.user.role || 'USER',
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/publish')
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.eventsService.publish(
      id,
      req.user.userId,
      req.user.role || 'USER',
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.eventsService.cancel(
      id,
      req.user.userId,
      req.user.role || 'USER',
    );
  }
}
