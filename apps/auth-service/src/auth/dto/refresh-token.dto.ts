import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class EnableMfaDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  code: string;
}

export class VerifyMfaDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  mfaCode: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  newPassword: string;
}