import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Not `GET /`: that path belongs to the frontend (served from public/)
  @Get('health')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiOkResponse({ description: 'Plain text.', schema: { type: 'string', example: 'Hello World!' } })
  getHello(): string {
    return this.appService.getHello();
  }
}
