# @homebots/injector

Depedency Injection library in Typescript

## How it works

There are two ways of using injections:

- using a single, global injector. The library exports `INJECTOR`, a singleton object that can be accessed from anywhere and used as the injector of an entire app.

- using a tree of injector with the ability to override classes/tokens on each level.
  The library exports a class, `TreeInjector`, which can be instantiated as a starting point, and forked as needed to create children. See documentation for more details.

## Usage

First you create a class:

```
class ElectricCar {}
```

That class can have one or more dependencies.
You can declare them with a decorator:

```
class Battery {}
class Motor {}

class ElectricCar {
  @Inject() battery: Battery;
  @Inject() motor: Motor;
}
```

But sometimes you don't have a concrete value just yet, or the value is not an object. You just want to have a placeholder.
You can do that using a `Symbol`:

```
export CarColor = Symbol('color')
export class ElectricCar {
  @Inject(CarColor) color: string;
}
```

But who is gonna provide the `CarColor`, you may ask?
Well, you can declare a provider for it:

```
import {INJECTOR} from '@homebots/injector';

INJECTOR.provide(CarColor, { factory: () => 'blue' });
```

You can also replace the implementation of classes:

```
import {INJECTOR} from '@homebots/injector';

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

const Color = Symbol('color');
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
