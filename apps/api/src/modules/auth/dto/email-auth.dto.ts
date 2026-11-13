import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class DeviceMetadataDto {
  @ApiPropertyOptional({ example: 'web-browser-uuid' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ example: 'Web Browser' })
  @IsString()
  @IsOptional()
  deviceModel?: string;

  @ApiPropertyOptional({ example: 'Web' })
  @IsString()
  @IsOptional()
  osVersion?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsString()
  @IsOptional()
  appVersion?: string;

  @ApiPropertyOptional({ example: 'WEB' })
  @IsString()
  @IsOptional()
  platform?: string;
}

export class RequiredDeviceMetadataDto {
  @ApiProperty({ example: 'd9b7a634-927b-4d43-a621-392c694a5e12' })
  @IsString()
  @IsNotEmpty({ message: 'Device ID is required' })
  deviceId: string;

  @ApiProperty({ example: 'Samsung Galaxy Tab S7' })
  @IsString()
  @IsNotEmpty({ message: 'Device model is required' })
  deviceModel: string;

  @ApiProperty({ example: 'Android 14' })
  @IsString()
  @IsNotEmpty({ message: 'OS version is required' })
  osVersion: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @IsNotEmpty({ message: 'App version is required' })
  appVersion: string;

  @ApiPropertyOptional({ example: 'ANDROID' })
  @IsString()
  @IsOptional()
  platform?: string;
}

export class EmailRegisterDto extends DeviceMetadataDto {
  @ApiProperty({ example: 'teacher@school.uz' })
  @IsEmail({}, { message: 'To‘g‘ri email manzilini kiriting' })
  email: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Parol kamida 8 ta belgidan iborat bo‘lishi kerak' })
  @MaxLength(128, { message: 'Parol juda uzun' })
  password: string;

  @ApiPropertyOptional({ example: 'Dilnoza' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Karimova' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Dilnoza Karimova' })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  fullName?: string;
}

export class EmailLoginDto extends RequiredDeviceMetadataDto {
  @ApiProperty({ example: 'teacher@school.uz' })
  @IsEmail({}, { message: 'To‘g‘ri email manzilini kiriting' })
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @MaxLength(128)
  password: string;
}

export class VerifyEmailDto extends DeviceMetadataDto {
  @ApiProperty({ example: 'teacher@school.uz' })
  @IsEmail({}, { message: 'To‘g‘ri email manzilini kiriting' })
  email: string;

  @ApiProperty({ example: '482910' })
  @IsString()
  @Length(6, 6, { message: 'Tasdiqlash kodi 6 ta raqamdan iborat bo‘lishi kerak' })
  code: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'teacher@school.uz' })
  @IsEmail({}, { message: 'To‘g‘ri email manzilini kiriting' })
  email: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'teacher@school.uz' })
  @IsEmail({}, { message: 'To‘g‘ri email manzilini kiriting' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'teacher@school.uz' })
  @IsEmail({}, { message: 'To‘g‘ri email manzilini kiriting' })
  email: string;

  @ApiProperty({ example: '482910' })
  @IsString()
  @Length(6, 6, { message: 'Kod 6 ta raqamdan iborat bo‘lishi kerak' })
  code: string;

  @ApiProperty({ example: 'NewStrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Yangi parol kamida 8 ta belgidan iborat bo‘lishi kerak' })
  @MaxLength(128)
  newPassword: string;
}

export class SendGoogleLinkCodeDto {
  @ApiProperty({ description: 'Short-lived account linking token from /auth/google 409 response' })
  @IsString()
  @IsNotEmpty({ message: 'Linking token is required' })
  linkToken: string;
}

export class LinkGoogleAccountDto extends RequiredDeviceMetadataDto {
  @ApiProperty({ description: 'Short-lived account linking token from /auth/google 409 response' })
  @IsString()
  @IsNotEmpty({ message: 'Linking token is required' })
  linkToken: string;

  @ApiPropertyOptional({ description: 'Existing account password to prove account ownership' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ description: '6-digit confirmation code sent to existing email' })
  @IsString()
  @IsOptional()
  @Length(6, 6, { message: 'Kod 6 ta raqamdan iborat bo‘lishi kerak' })
  otpCode?: string;
}

export class SendOtpDto {
  @ApiProperty({ example: 'teacher@gmail.com' })
  @IsEmail({}, { message: 'To‘g‘ri email manzilini kiriting' })
  email: string;
}

export class VerifyOtpDto extends DeviceMetadataDto {
  @ApiProperty({ example: 'teacher@gmail.com' })
  @IsEmail({}, { message: 'To‘g‘ri email manzilini kiriting' })
  email: string;

  @ApiProperty({ example: '482910' })
  @IsString()
  @Length(6, 6, { message: 'Tasdiqlash kodi 6 ta raqamdan iborat bo‘lishi kerak' })
  code: string;
}
