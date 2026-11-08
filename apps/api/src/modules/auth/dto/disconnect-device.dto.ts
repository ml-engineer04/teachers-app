import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DisconnectDeviceDto {
  @ApiPropertyOptional({
    description: 'Specific device ID to disconnect when performing remote revocation',
    example: 'd9b7a634-927b-4d43-a621-392c694a5e12',
  })
  @IsString()
  @IsOptional()
  deviceIdToRemove?: string;
}
