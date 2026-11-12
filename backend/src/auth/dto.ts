import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Іван Петренко' })
  @IsNotEmpty({ message: 'Fullname is required.' })
  @IsString({ message: 'Fullname must be a string.' })
  fullname: string;

  @ApiProperty({ minLength: 8, example: 'correct-horse-battery' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password: string;

  @ApiProperty({ description: 'Must equal `password`.', example: 'correct-horse-battery' })
  @IsNotEmpty({ message: 'Confirm Password is required.' })
  confirmPassword: string;

  @ApiProperty({ format: 'email', example: 'ivan@example.com' })
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Email must be valid.' })
  email: string;
}

export class LoginDto {
  @ApiProperty({ format: 'email', example: 'ivan@example.com' })
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Email must be valid.' })
  email: string;

  @ApiProperty({ example: 'correct-horse-battery' })
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}
