/// <reference types="reflect-metadata" />

import {
  AbstractClass,
  Class,
  Factory,
  InjectableType,
  InjectionToken,
  isConstructor,
  isFactoryProvider,
  Provider,
} from './types';

const injector = Symbol('injector');
const injectorMetadataKey = Symbol('injector');
const initialize = Symbol('@@initialize');
const cycleStack: any = [];

export class Injector {
  protected cache = new Map();
  protected providers = new Map<InjectableType, Factory | Class>();

  get<T>(token: InjectableType<T>): T {
    if (this.canProvide(token)) {
      return this.getFromCache(token) || this.getFromProviderAndCache(token);
    }

    this.throwNotFound(token);
  }

  createNew<T>(token: InjectableType<T>): T {
    return this.getFromProvider(token) || this.throwNotFound(token);
  }

  has<T>(token: InjectableType<T>): boolean {
    return this.cache.has(token);
  }

  canProvide<T>(token: InjectableType<T>): boolean {
    return this.providers.has(token);
  }

  provide<T>(type: Class<T>): void;
  provide<T>(type: Class<T>, replaceWith: Class<T>): void;
  provide<T>(type: Class<T>, provideWith: Factory<T>): void;
  provide<T>(type: AbstractClass<T>, replaceWith: Class<T>): void;
  provide<T>(type: InjectionToken<T>, provideAs: Class<T>): void;
  provide<T>(type: InjectionToken<T>, useFactory: Factory<T>): void;
  provide<T>(type: any, value?: Class<T> | Factory<T>): this {
    const replaceWith = (value || type) as Class<T> | Factory<T>;

    this.providers.set(type, replaceWith);

    return this;
  }

  provideAll(providers: Provider[]) {
    providers.forEach((provider) => {
      if (isFactoryProvider(provider)) {
        return this.provide(provider.type, provider.useFactory);
      }

      this.provide(provider.type as any, provider.use);
    });
  }

  protected getFromCache<T>(token: InjectableType<T>): T | undefined {
    if (this.cache.has(token)) {
      return this.cache.get(token);
    }
  }

  protected getFromProvider<T>(token: InjectableType<T>): T | undefined {
    if (this.providers.has(token)) {
      return this.fromProvider(token);
    }
  }

  protected getFromProviderAndCache<T>(token: InjectableType<T>): T | undefined {
    const value: T = this.getFromProvider(token);
    this.cache.set(token, value);

    return value;
  }

  protected throwNotFound(token: InjectableType<any>): null {
    throw new ReferenceError('Injector could not find a value for ' + getNameOfInjectable(token));
  }

  private fromProvider<T>(token: InjectableType<T>): T {
    const provider: Class<T> | Factory<T> = this.providers.get(token);

    if (isConstructor<T>(provider)) {
      return this.fromConstructor(provider);
    }

    return this.fromFactory(token, provider);
  }

  protected fromFactory<T>(token: InjectableType<T>, provider: Factory<T>): T {
    if (cycleStack.includes(token)) {
      const cycle = cycleStack.map(getNameOfInjectable).join(' <- ');
      cycleStack.length = 0;
      throw new ReferenceError('Cyclic dependency found: ' + cycle);
    }

    cycleStack.push(token);
    const dependencies = (provider.dependencies || []).map((token) => this.get(token));
    const value = provider.factory.apply(null, dependencies);
    cycleStack.pop();

    return value;
  }

  protected fromConstructor<T>(Constructor: Class<T>) {
    const value = new Constructor();
    setInjectorOf(value, this);

    if (value[initialize]) {
      value[initialize]();
    }

    return value;
  }

  static get initialize() {
    return initialize;
  }

  static get global(): Injector {
    if (!Injector[injector]) {
      Injector[injector] = new Injector();
    }

    return Injector[injector];
  }

  static getInjectorOf(target: any): Injector | null {
    if (target && typeof target === 'object') {
      return Reflect.getOwnMetadata(injectorMetadataKey, target) || null;
    }

    return null;
  }

  static setInjectorOf(target: any, injector: Injector): void {
    Reflect.defineMetadata(injectorMetadataKey, injector, target);
  }
}

export class TreeInjector extends Injector {
  constructor(protected parent: Injector = Injector.global) {
    super();
  }

  fork(): TreeInjector {
    return new TreeInjector(this);
  }

  get<T>(token: InjectableType<T>): T {
    return this.getFromCache(token) || this.getFromProviderAndCache(token) || this.getFromParent(token);
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

export function Factory<T>(factory: (...deps: any[]) => T, dependencies?: InjectableType[]): Factory<T> {
  return { factory, dependencies };
}

export function Value<T>(value: T): Factory<T> {
  return { factory: () => value };
}

function getNameOfInjectable(token: InjectableType) {
  if (isConstructor(token)) {
    return 'class ' + token.name;
  }

  return String(token);
}

const INJECTOR = Injector.global;

export const setInjectorOf = Injector.setInjectorOf;
export const getInjectorOf = Injector.getInjectorOf;
export const inject = INJECTOR.get.bind(INJECTOR) as Injector['get'];
export const provide = INJECTOR.provide.bind(INJECTOR) as Injector['provide'];
