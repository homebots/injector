# @homebots/injector

Depedency Injection library for any project, written in Typescript

## Introduction

The library exports a "global" injector, which can be used as-is to inject everything. It's called `Injector.global`. You can pair that with the "inject" function exported in the library.

But if you need to nest injectors and have a tree of dependencies, use `TreeInjector` instead.

## How it works

There are two ways of using injections:

- using a global injector: the library exports `Injector.global`, a singleton object that can be accessed from anywhere and used as the injector of an entire app.

- using a tree of injector with the ability to override classes/tokens on each level.
  The library exports a class, `TreeInjector`, which can be instantiated as a starting point, and forked as needed to create children. See documentation below for more details.

First you create a class:

```typescript
class ElectricCar {}
```

That class can have one or more dependencies.
You can declare them with a decorator:

```typescript
class Battery {}
class Motor {}

class ElectricCar {
  @Inject() battery: Battery;
  @Inject() motor: Motor;
}
```

But sometimes you don't have a concrete value just yet, or the value is not an object. Maybe you just want to have a placeholder.

You can do that using an `InjectionToken`:

```typescript
import { Injector, InjectionToken } from '@homebots/injector';

export CarColor = new InjectionToken<string>('color');

export class ElectricCar {
  @Inject(CarColor) color: string;

  // or

  get color() {
    return inject(CarColor);
  }
}
```

But who is gonna provide the `CarColor`? You can declare a provider for it:

```typescript
import { Injector, Value } from '@homebots/injector';

Injector.global.provide(CarColor, Value('blue') });

// or

provide(CarColor, Value('blue') });
```

You can also replace the implementation of classes:

```typescript
import { Injector, provide } from '@homebots/injector';

class Motor {}
class ElectricMotor {}

provide(Motor, ElectricMotor);

class Car {
  // 'motor' will have an instance of ElectricMotor
  @Inject() motor: Motor;
}
```

## Examples

```typescript
import { Injector } from '@homebots/injector';

const Color = new InjectionToken('color');
class Battery {}
class Engine {}

class GasolineEngine extends Engine {}

class ElectricMotor extends Engine {
  @Inject() battery: Battery;
}

class Car {
  @Inject() engine: Engine;
  @Inject(Color) color: string;
}

// common injector for all cars
const baseInjector = new TreeInjector();
baseInjector.provide(Color, Value('black'));

// branch off to provide electric car dependencies
const electricCarInjector = baseInjector.fork();
electricCarInjector.provide(Engine, ElectricMotor);
electricCarInjector.provide(Car);

// branch off again to provide gasoline car dependencies
const gasolineCarInjector = baseInjector.fork();
gasolineCarInjector.provide(Engine, GasolineEngine);
gasolineCarInjector.provide(Car);

const electricCar = electricCarInjector.get(Car);
const gasolineCar = gasolineCarInjector.get(Car);

expect(electricCar.engine instanceof ElectricMotor).toBe(true);
expect(gasolineCar.engine instanceof GasolineEngine).toBe(true);
expect(electricCar.color).toBe('black');
```

## API

### Injector

- **get(token)**

Retrieves a value for a given injectable token. The token can be either a `Class` or a `InjectionToken`.
Values are cached once they are resolved, so constructors and factories will be singleton.

- **createNew(token)**

Retrieves a value for a given injectable token. The token can be either a `Class` or a `InjectionToken`.
Values are never cached.

- **has(token)**

Check if the injector has a value stored for a given token. Returns false before the first time the token is retrieved, true otherwise.

- **canProvide(token)**

Checks if a token can be provided by this injector. It differs from `has()` because it just checks for the possibility of an injection.

- **provide(Class)**
- **provide(Class, SubstitutionClass)**
- **provide(AbstractClass, Class)**
- **provide(InjectionToken, Class)**
- **provide(InjectionToken, factory)**

Declares an injectable type.

`factory` is a function that returns a value.

It can be a static value, in which case the `Value` wrapper should be used

It can also be dynamic value. For that case, pass a function to `Factory`, and optionally an array of dependencies.

Example:

```typescript
class A { number = 1 }
class B { number = 2 }
const C = new InjectionToken<number>();
const T = new InjectionToken<number>();

injector.provide(C, Value(3));

injector.provide(T, {
  Factory((a: A, b: B, c: number) => a.number + b.number + c),
  [A, B, C]
);

expect(injector.get(T)).toBe(6);
```

### TreeInjector

- **fork()**
- **fork(Injector)**

Creates a new injector that can hold its own provided dependencies. If a provider is not found, it will look at its parent for dependencies.
A parent can be provided at construction time. By default it points to the root injector.
