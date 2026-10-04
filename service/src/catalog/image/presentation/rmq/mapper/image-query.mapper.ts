import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { GetImageQuery } from '../../../application/query/get-image.query';
import { GetImageQueryDto } from '../dto/get-image-query.dto';

@Injectable()
export class ImageQueryMapper {
  async toGetByUuidQuery(dto: GetImageQueryDto): Promise<GetImageQuery> {
    const query = plainToInstance(GetImageQuery, dto);
    await validateOrReject(query, { whitelist: true, forbidNonWhitelisted: true });
    return query;
  }
}
