export interface AbstractClass<T> {
  prototype: T;
}

export interface Class<T = any> {
  new (...args: any[]): T;
}

export class InjectionToken<T> {
  constructor(public readonly name?: string) {
    return (Symbol(name) as any) as T;
  }
}

export type Type<T = any> = AbstractClass<T> | Class<T>;
export type InjectableType<T = any> = InjectionToken<T> | Type<T>;

export interface Factory<T = any> {
  factory: (...args: any[]) => T;
  dependencies?: InjectableType[];
}

export type ClassProvider<T> = { type: Class<T>; use: Class<T> };
export type AbstractClassProvider<T> = { type: AbstractClass<T>; use: Class<T> };
export type TokenProvider<T> = { type: InjectionToken<T>; use: Class<T> };
export type FactoryProvider<T> = { type: InjectionToken<T>; useFactory: Factory<T> };

export type Provider<T = unknown> = ClassProvider<T> | TokenProvider<T> | AbstractClassProvider<T> | FactoryProvider<T>;

export function isConstructor<T = any>(value: any): value is Class<T> {
  return typeof value === 'function';
}

export function isFactory(value: any): value is Factory<any> {
  return typeof value === 'object' && typeof value.factory === 'function';
}

export function isFactoryProvider<T>(provider: Provider<T>): provider is FactoryProvider<T> {
  return 'useFactory' in provider;
}
