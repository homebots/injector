/// <reference types="reflect-metadata" />

import { getInjectorOf, INJECTOR } from './injector';
import { Class, InjectableType, Type } from './types';

export function getTypeOfProperty(target: any, property: any) {
  return Reflect.getMetadata('design:type', target, property as string | symbol);
}

export function createInjection<T>(target: any, property: any, type: InjectableType<T>) {
  Object.defineProperty(target, property, {
    configurable: false,
    enumerable: false,
    get: createGetter(target, property, type),
  });
}

function createGetter<T>(target: any, property: any, type?: InjectableType<T>) {
  return function () {
    type = type || getTypeOfProperty(target, property);

    if (!type) {
      throw new Error('No type found for property ' + property);
    }

    const injector = getInjectorOf(this);
    const value: T = injector.get(type);

    return value;
  };
}

export function Injectable<T>(type?: Type<T>) {
  return function (target: Class<T>) {
    INJECTOR.provide(type || target, target);
  };
}

export function Inject<T>(type?: InjectableType<T>) {
  return function (target: any, property: any): void {
    createInjection(target, property, type);
  };
}
