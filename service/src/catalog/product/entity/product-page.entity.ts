import { ProductEntity } from './product.entity';

export class ProductPageEntity {
  items: ProductEntity[];
  total: number;
  limit: number;
  offset: number;
}
