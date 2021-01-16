/// <reference types="reflect-metadata" />

import { Class, getInjectorOf, InjectableType, INJECTOR, Type } from './injector';

export function getTypeOfProperty<T, P extends keyof T>(target: Type<T>, property: P) {
  return Reflect.getMetadata('design:type', target, property as string | symbol);
}

export function Inject<T>(type?: InjectableType<T>) {
  return function (target: any, property: any): void {
    createInjection(target, property, type);
  };
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
    const token = type || getTypeOfProperty(target as Class<T>, property);
    const injector = getInjectorOf(this);
    const value: T = injector.get(token);

    return value;
  };
}

export function Injectable<T>(type?: Type<T>) {
  return function (target: Class<T>) {
    INJECTOR.provide(type || target, target);
  };
}
