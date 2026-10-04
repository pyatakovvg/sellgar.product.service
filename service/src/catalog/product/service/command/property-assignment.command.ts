import { PropertyKind } from '../../../property/property-kind.enum';
import { PropertyValueCommand } from './property-value.command';

export class PropertyAssignmentCommand {
  constructor(
    readonly propertyCode: string,
    readonly values: PropertyValueCommand[],
    readonly propertyKind?: PropertyKind,
  ) {}
}
