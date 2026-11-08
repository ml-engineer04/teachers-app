import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Google OAuth 2.0 ID Token (JWT) issued by Google',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Google ID Token is required' })
  idToken: string;

  @ApiProperty({
    description: 'Unique hardware or installation UUID of the mobile device',
    example: 'd9b7a634-927b-4d43-a621-392c694a5e12',
  })
  @IsString()
  @IsNotEmpty({ message: 'Device ID is required' })
  deviceId: string;

  @ApiProperty({
    description: 'Device model name',
    example: 'Samsung Galaxy Tab S7',
  })
  @IsString()
  @IsNotEmpty({ message: 'Device model is required' })
  deviceModel: string;

  @ApiProperty({
    description: 'Operating system version',
    example: 'Android 14',
  })
  @IsString()
  @IsNotEmpty({ message: 'OS version is required' })
  osVersion: string;

  @ApiProperty({
    description: 'SmartTeacherBook App version',
    example: '1.0.0',
  })
  @IsString()
  @IsNotEmpty({ message: 'App version is required' })
  appVersion: string;

  @ApiPropertyOptional({
    description: 'Client platform (ANDROID | IOS | WEB)',
    example: 'ANDROID',
  })
  @IsString()
  @IsOptional()
  platform?: string;

  @ApiPropertyOptional({
    description: 'FCM push token for remote notifications and device sync',
  })
  @IsString()
  @IsOptional()
  pushToken?: string;
}
