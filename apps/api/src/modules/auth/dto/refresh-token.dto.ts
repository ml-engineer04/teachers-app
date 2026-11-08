import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Long-lived SmartTeacherBook refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;

  @ApiProperty({
    description: 'Target hardware / installation device ID',
    example: 'd9b7a634-927b-4d43-a621-392c694a5e12',
  })
  @IsString()
  @IsNotEmpty({ message: 'Device ID is required' })
  deviceId: string;
}
