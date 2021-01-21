/// <reference types="reflect-metadata" />

import { AbstractClass, Class, Factory, InjectableType, isConstructor, Type } from './types';

const injectorMetadataKey = Symbol('injector');
const cycleStack: any = [];

export class Injector {
  protected cache = new Map();
  protected providers = new Map<InjectableType, Factory | Class>();

  get<T>(token: InjectableType<T>): T | null {
    return this.getFromCache(token) || this.getFromProvider(token) || this.throwNotFound(token);
  }

  has<T>(token: InjectableType<T>): boolean {
    return this.cache.has(token);
  }

  canProvide<T>(token: InjectableType<T>): boolean {
    return this.providers.has(token);
  }

  provide<T>(type: Class<T>): void;
  provide<T>(type: Class<T>, replaceWith: Class<T>): void;
  provide<T>(type: AbstractClass<T>, replaceWith: Class<T>): void;
  provide<T>(type: symbol, replaceWith: Class<T>): void;
  provide<T>(type: symbol, factory: Factory<T>): void;
  provide<T>(...args: any[]): this {
    const type: Type<T> = args[0];
    const replaceWith: Class<T> = args[1] || args[0];

    this.providers.set(type, replaceWith);

    return this;
  }

  protected getFromCache<T>(token: InjectableType<T>) {
    if (this.cache.has(token)) {
      return this.cache.get(token) as T;
    }
  }

  protected getFromProvider<T>(token: InjectableType<T>) {
    if (this.providers.has(token)) {
      return this.fromProvider(token) as T;
    }
  }

  protected throwNotFound(token: InjectableType<any>): null {
    throw new ReferenceError('Injector could not find a value for ' + getNameOfInjectable(token));
  }

  private fromProvider<T>(token: InjectableType<T>): T {
    const provider: Class<T> | Factory<T> = this.providers.get(token);

    if (isConstructor<T>(provider)) {
      const value = this.fromConstructor(provider);
      this.cache.set(token, value);

      return value;
    }

    return this.fromFactory(token, provider);
  }

  private fromFactory<T>(token: InjectableType<T>, provider: Factory<T>): T {
    if (cycleStack.includes(token)) {
      const cycle = cycleStack.map(getNameOfInjectable).join(' <- ');
      cycleStack.length = 0;
      throw new ReferenceError('Cyclic dependency found: ' + cycle);
    }

    cycleStack.push(token);
    const dependencies = (provider.dependencies || []).map((token) => this.get(token));
    const value = provider.factory.apply(null, dependencies);
    this.cache.set(token, value);
    cycleStack.pop();

    return value;
  }

  private fromConstructor<T>(Constructor: Class<T>) {
    const value = new Constructor();
    setInjectorOf(value, this);

    return value;
  }
}

export const INJECTOR = new Injector();

export class TreeInjector extends Injector {
  constructor(protected parent: Injector = INJECTOR) {
    super();
  }

  fork(): TreeInjector {
    return new TreeInjector(this);
  }

  get<T>(token: InjectableType<T>): T | null {
    return this.getFromCache(token) || this.getFromProvider(token) || this.getFromParent(token);
  }

  canProvide<T>(token: InjectableType<T>): boolean {
    return this.providers.has(token) || this.parent.canProvide(token);
  }

  protected getFromParent<T>(token: InjectableType<T>) {
    const value = this.parent.get(token);

    if (isConstructor(token)) {
      setInjectorOf(value, this);
    }

    return value;
  }
}

export function getInjectorOf(target: any): Injector | null {
  if (target && typeof target === 'object') {
    return Reflect.getOwnMetadata(injectorMetadataKey, target) || null;
  }

  return null;
}

export function setInjectorOf(target: any, injector: Injector): void {
  Reflect.defineMetadata(injectorMetadataKey, injector, target);
}

function getNameOfInjectable(token: InjectableType) {
  if (isConstructor(token)) {
    return 'class ' + token.name;
  }

  return String(token);
}
