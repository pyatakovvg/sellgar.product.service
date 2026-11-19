import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

const VALIDATE_METADATA_KEY = Symbol('validate_dto');

export function Validate(constructor: new (...args: any[]) => any) {
  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    /**
     * Сохраняем информацию: какой индекс аргумента и какой DTO использовать
     */
    const existingParameters: any[] = Reflect.getOwnMetadata(VALIDATE_METADATA_KEY, target, propertyKey) || [];

    existingParameters.push({ index: parameterIndex, constructor });

    Reflect.defineMetadata(VALIDATE_METADATA_KEY, existingParameters, target, propertyKey);
  };
}

export function UseValidation() {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const metadata = Reflect.getOwnMetadata(VALIDATE_METADATA_KEY, target, propertyKey);

      if (metadata) {
        for (const { index, constructor } of metadata) {
          if (args[index]) {
            /**
             * Трансформация в экземпляр класса
             */
            const instance = plainToInstance(constructor, args[index]);
            /**
             * Валидация
             */
            await validateOrReject(instance);
            /**
             * Заменяем сырые данные на валидированный экземпляр
             */
            args[index] = instance;
          }
        }
      }

      return originalMethod.apply(this, args);
    };
  };
}
