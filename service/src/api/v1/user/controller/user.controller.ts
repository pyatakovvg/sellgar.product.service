import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { GetUserDto } from './dto/get-user.dto';

import { UserService } from '../service/user.service';

@Controller()
export class UserController {
  constructor(private readonly authService: UserService) {}

  @MessagePattern({ cmd: 'identity.user.create' })
  async create(@Payload() dto: GetUserDto) {
    return await this.authService.getByUuid(dto.uuid);
  }

  @MessagePattern({ cmd: 'identity.user.update' })
  async update(@Payload() dto: GetUserDto) {
    return await this.authService.getByUuid(dto.uuid);
  }
}
