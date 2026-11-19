import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';

import { UserModel } from '../user.model';

@Injectable()
export class UserRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(UserModel) private readonly userModel: Repository<UserModel>,
  ) {}

  async getByUuid(uuid: string) {
    try {
      await this.dataSource
        .createQueryBuilder()
        .select(['user.uuid', 'user.login', 'user.isBlocked', 'user.createdAt', 'user.updatedAt'])
        .from(UserModel, 'user')
        .where('user.uuid = :uuid', { uuid })
        .getOne();
    } catch (err) {
      console.error(12367, err);
    }
  }
}
