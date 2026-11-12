import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { User } from '../user/user.model';

/** User fields that are safe to send to the browser (never the password hash). */
function publicUser(user: User) {
  return {
    id: user.id,
    fullname: user.fullname,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  };
}

/**
 * Session endpoints. Tokens travel in httpOnly cookies (`access_token`,
 * `refresh_token`); the JSON body only carries the public user profile.
 * Validation errors come back as `{ field: message }` with HTTP 400.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        confirmPassword: 'Password and confirm password are not the same.',
      });
    }
    const { user } = await this.authService.register(dto, res);
    return { user: publicUser(user) };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user } = await this.authService.login(dto, res);
    return { user: publicUser(user) };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) res: Response) {
    return { message: await this.authService.logout(res) };
  }

  /** Issues a fresh access-token cookie from the refresh-token cookie. */
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.refreshToken(req, res);
    return { ok: true };
  }
}
