import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EvictDeviceDto {
  @ApiProperty({
    description: 'Verified Google OAuth 2.0 ID Token proving account ownership',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Google ID Token is required for authenticated eviction' })
  idToken: string;

  @ApiProperty({
    description: 'Device ID to disconnect and free up the 2-device slot',
    example: 'android_dev_old_uuid',
  })
  @IsString()
  @IsNotEmpty({ message: 'Device ID to remove is required' })
  deviceIdToRemove: string;
}
