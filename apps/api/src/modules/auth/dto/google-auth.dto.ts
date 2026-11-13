import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiPropertyOptional({
    description: 'Google OAuth 2.0 / OIDC ID Token (JWT) issued by Google Identity Services or Native SDK',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString()
  @IsOptional()
  idToken?: string;

  @ApiPropertyOptional({
    description: 'Optional OAuth 2.0 Authorization Code (exchanged server-side using GOOGLE_CLIENT_SECRET)',
  })
  @IsString()
  @IsOptional()
  authorizationCode?: string;

  @ApiPropertyOptional({
    description: 'Redirect URI used during OAuth 2.0 authorization code flow',
  })
  @IsString()
  @IsOptional()
  redirectUri?: string;

  @ApiPropertyOptional({
    description: 'PKCE code verifier matching code_challenge in authorization code flow',
  })
  @IsString()
  @IsOptional()
  codeVerifier?: string;

  @ApiPropertyOptional({
    description: 'Cryptographic OIDC nonce used to bind the ID token to this authentication attempt',
  })
  @IsString()
  @IsOptional()
  nonce?: string;

  @ApiProperty({
    description: 'Unique hardware or installation UUID of the client device',
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
