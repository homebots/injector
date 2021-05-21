# @homebots/injector

Depedency Injection library for any project, written in Typescript

## Introduction

The library exports a "global" injector, which can be used as-is to inject everything. It's called `INJECTOR`. You can pair that with the "inject" function exported in the library.

But if you need to nest injectors and have a tree of dependencies, use `TreeInjector` instead.

## How it works

There are two ways of using injections:

- using a global injector: the library exports `INJECTOR`, a singleton object that can be accessed from anywhere and used as the injector of an entire app.

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
export CarColor = new InjectionToken('color')

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
import { INJECTOR } from '@homebots/injector';

INJECTOR.provide(CarColor, { factory: () => 'blue' });

// or

provide(CarColor, { factory: () => 'blue' });
```

You can also replace the implementation of classes:

```typescript
import { INJECTOR } from '@homebots/injector';

class Motor {}
class ElectricMotor {}

INJECTOR.provide(Motor, ElectricMotor);

class Car {
  // 'motor' will have an instance of ElectricMotor
  @Inject(Motor) motor: Motor;
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
baseInjector.provide(Color, { factory: () => 'black' });

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

`factory` is an object which needs to have a property, called "factory", that when called returns a value for a token.
The factory function can inject other dependencies, declared in the same object with the name "dependencies", which should be an array containing Class or InjectionToken.

Example:

```typescript
class A {}
class B {}
const C = new InjectionToken();
const T = new InjectionToken();

injector.provide(C, { factory: () => 1 });

injector.provide(T, {
  factory: (a: A, b: B, c: number) => c,
  dependencies: [A, B, C],
});
```

### TreeInjector

- **fork()**
- **fork(Injector)**

Creates a new injector that can hold its own provided dependencies. If a provider is not found, it will look at its parent for dependencies.
A parent can be provided at construction time. By default it points to the root injector.
