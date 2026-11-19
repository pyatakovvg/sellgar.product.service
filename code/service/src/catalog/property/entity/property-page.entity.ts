import { PropertyEntity } from './property.entity';

export class PropertyPageEntity {
  items: PropertyEntity[];
  total: number;
  limit: number;
  offset: number;
}
