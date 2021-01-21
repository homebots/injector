export interface AbstractClass<T> {
  prototype: T;
}

export interface Class<T = any> {
  new (...args: any[]): T;
}

export type Type<T = any> = AbstractClass<T> | Class<T>;
export type InjectableType<T = any> = symbol | Type<T>;

export interface Factory<T = any> {
  factory: (...args: any[]) => T;
  dependencies?: InjectableType[];
}

export type ClassProvider<T> = { type: Class<T>; use: Class<T> };
export type AbstractClassProvider<T> = { type: AbstractClass<T>; use: Class<T> };
export type SymbolClassProvider<T> = { type: symbol; use: Class<T> };
export type FactoryProvider<T> = { type: symbol; useFactory: Factory<T> };

export type Provider<T = unknown> =
  | ClassProvider<T>
  | SymbolClassProvider<T>
  | AbstractClassProvider<T>
  | FactoryProvider<T>;

export function isConstructor<T = any>(value: any): value is Class<T> {
  return typeof value === 'function';
}

export function isFactory(value: any): value is Factory<any> {
  return typeof value === 'object' && typeof value.factory === 'function';
}
