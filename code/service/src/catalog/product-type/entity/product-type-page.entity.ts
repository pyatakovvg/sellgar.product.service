import { ProductTypeEntity } from './product-type.entity';

export class ProductTypePageEntity {
  items: ProductTypeEntity[];
  total: number;
  limit: number;
  offset: number;
}
