/// <reference types="reflect-metadata" />

export interface AbstractClass<T> {
  prototype: T;
}

export interface Class<T = any> {
  new (...args: any[]): T;
}

export type Type<T = any> = AbstractClass<T> | Class<T>;
export type InjectableType<T = any> = symbol | Type<T>;

export function isConstructor(value: any): value is Class<any> {
  return typeof value === 'function';
}

export interface FactoryProvider<T = any> {
  factory: (...args: any[]) => T;
  dependencies?: InjectableType[];
}

export class Injector {
  protected cache = new Map();
  protected providers = new Map<InjectableType, FactoryProvider | Class>();

  get<T>(token: InjectableType<T>): T | null {
    if (this.cache.has(token)) {
      return this.cache.get(token) as T;
    }

    if (this.providers.has(token)) {
      return this.fromProvider(token) as T;
    }

    throw new ReferenceError('Injector could not find a value for ' + getInjectableName(token));
  }

  canProvide<T>(token: InjectableType<T>): boolean {
    return this.cache.has(token) || this.providers.has(token) || isConstructor(token);
  }

  provide<T>(token: InjectableType<T>, provider?: FactoryProvider | Class<T>): void {
    if (isConstructor(token) && !provider) {
      this.providers.set(token, token);
      return;
    }

    this.providers.set(token, provider);
  }

  private fromProvider<T>(token: InjectableType<T>) {
    const provider = this.providers.get(token);

    if (isConstructor(provider)) {
      return this.fromConstructor(provider);
    }

    const dependencies = (provider.dependencies || []).map((token) => this.get(token));
    const value = provider.factory.apply(null, dependencies);
    this.cache.set(token, value);

    return value;
  }

  private fromConstructor<T>(Constructor: Class<T>) {
    const value = new Constructor();
    this.cache.set(Constructor, value);
    setInjectorOf(value, this);

    return value;
  }
}

export const INJECTOR = new Injector();
const INJECTOR_KEY = Symbol('injector');

export class TreeInjector extends Injector {
  constructor(protected parent: Injector = INJECTOR) {
    super();
  }

  fork(): TreeInjector {
    return new TreeInjector(this);
  }

  get<T>(token: InjectableType<T>): T | null {
    let value: T;

    if (this.canProvide(token)) {
      value = super.get(token);
    } else {
      value = this.parent.get(token);
    }

    if (isConstructor(token)) {
      setInjectorOf(value, this);
    }

    return value;
  }

  canProvide<T>(token: InjectableType<T>): boolean {
    return this.cache.has(token) || this.providers.has(token);
  }
}

export function getInjectorOf(target: any): Injector | null {
  if (target && typeof target === 'object') {
    return Reflect.getOwnMetadata(INJECTOR_KEY, target) || null;
  }

  return null;
}

export function setInjectorOf(target: any, injector: Injector): void {
  Reflect.defineMetadata(INJECTOR_KEY, injector, target);
}

function getInjectableName(token: InjectableType) {
  if (isConstructor(token)) {
    return 'class ' + token.name;
  }

  return String(token);
}
