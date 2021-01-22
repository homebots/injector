import 'reflect-metadata';
import { getInjectorOf, Inject, INJECTOR, TreeInjector, Injectable, Provider, InjectionToken } from './index';

describe('Injector', () => {
  it('should throw an error', () => {
    expect(() => INJECTOR.get(null)).toThrow();
  });

  it('should return an instance of a class', () => {
    class Class {}
    INJECTOR.provide(Class);

    expect(INJECTOR.get(Class) instanceof Class).toBe(true);
    expect(INJECTOR.has(Class)).toBe(true);
    expect(INJECTOR.canProvide(Class)).toBe(true);
  });

  it('should return an instance of an associated type for a class', () => {
    class Class {}
    class AssociatedClass {}
    INJECTOR.provide(Class, AssociatedClass);

    expect(INJECTOR.get(Class) instanceof AssociatedClass).toBe(true);
    expect(INJECTOR.has(Class)).toBe(true);
    expect(INJECTOR.has(AssociatedClass)).toBe(false);
  });

  it('should use the concrete type associated with an InjectionToken', () => {
    const abstractType = new InjectionToken();
    const typeNotProvided = new InjectionToken();
    class Class {}

    INJECTOR.provide(abstractType, Class);
    expect(INJECTOR.get(abstractType) instanceof Class).toBe(true);
    expect(INJECTOR.has(abstractType)).toBe(true);
    expect(INJECTOR.has(typeNotProvided)).toBe(false);
  });

  it('should use the factory function associated with an InjectionToken', () => {
    const abstractType = new InjectionToken();
    const numberFactory = {
      factory() {
        return 5;
      },
    };

    INJECTOR.provide(abstractType, numberFactory);
    expect(INJECTOR.get(abstractType)).toBe(5);
  });

  it('should give the factory function associated with an InjectionToken its dependencies', () => {
    const abstractType = new InjectionToken();
    class Class {
      value = 10;
    }

    const numberFactory = {
      factory(k: Class) {
        return k.value + 5;
      },
      dependencies: [Class],
    };

    INJECTOR.provide(abstractType, numberFactory);
    INJECTOR.provide(Class);
    expect(INJECTOR.get(abstractType)).toBe(15);
  });

  it('should prevent cyclic dependencies', () => {
    const alice = new InjectionToken('alice');
    const bob = new InjectionToken('bob');

    INJECTOR.provide(alice, {
      factory(bob) {
        return bob;
      },
      dependencies: [bob],
    });

    INJECTOR.provide(bob, {
      factory(alice) {
        return alice;
      },

      dependencies: [alice],
    });

    expect(() => INJECTOR.get(alice)).toThrowError('Cyclic dependency found: ' + String(alice) + ' <- ' + String(bob));
  });

  it('should allow multiple provider declarations', () => {
    class Class {}
    class Surrogate {}
    abstract class AbstractClass {}
    const Token = new InjectionToken('token');
    const NumberToken = new InjectionToken('number');
    const numberFactory = { factory: () => 123 };

    const providers: Provider[] = [
      { type: Class, use: Surrogate },
      { type: AbstractClass, use: Class },
      { type: Token, use: Class },
      { type: NumberToken, useFactory: numberFactory },
    ];

    INJECTOR.provideAll(providers);

    expect(INJECTOR.canProvide(Class)).toBe(true);
    expect(INJECTOR.canProvide(AbstractClass)).toBe(true);
    expect(INJECTOR.canProvide(Token)).toBe(true);
    expect(INJECTOR.canProvide(NumberToken)).toBe(true);
  });
});

describe('TreeInjector', () => {
  it('should fork from global injector', () => {
    class Class {}
    INJECTOR.provide(Class);

    const injector = new TreeInjector();

    expect(INJECTOR.get(Class) === injector.get(Class)).toBe(true);
    expect();
  });

  it('should follow a chain of injectors', () => {
    class Class {}
    INJECTOR.provide(Class);

    const level1 = new TreeInjector();
    const level2 = level1.fork();

    expect(level1.canProvide(Class)).toBe(true);
    expect(level2.canProvide(Class)).toBe(true);

    expect(level1.has(Class)).toBe(false);
    expect(level2.has(Class)).toBe(false);

    expect(level2.get(Class) === INJECTOR.get(Class)).toBe(true);
  });

  it('should associate a injector that provides a class to its instance', () => {
    class Class1 {}
    class Class2 {}
    class Class3 {}

    INJECTOR.provide(Class1);
    INJECTOR.provide(Class2);
    INJECTOR.provide(Class3);

    const level1 = new TreeInjector();
    const level2 = level1.fork();
    const level3 = level2.fork();

    const class1 = level1.get(Class1);
    const class2 = level2.get(Class2);
    const class3 = level3.get(Class3);

    expect(level1 === getInjectorOf(class1)).toBe(true);
    expect(level2 === getInjectorOf(class2)).toBe(true);
    expect(level3 === getInjectorOf(class3)).toBe(true);
  });

  it('should allow multiple copies of a token', () => {
    class Class {}
    const injector = new TreeInjector();
    const fork = injector.fork();

    injector.provide(Class);
    fork.provide(Class);

    expect(injector.has(Class)).toBe(false);
    expect(injector.get(Class)).not.toBe(undefined);
    expect(injector.get(Class) === fork.get(Class)).toBe(false);
    expect(injector.canProvide(Class)).toBe(true);
    expect(fork.canProvide(Class)).toBe(true);
  });
});

describe('getInjectorOf()', () => {
  it('should return the injector of an instance of the class', () => {
    class Class {}
    INJECTOR.provide(Class);

    const instance = INJECTOR.get(Class);
    expect(getInjectorOf(instance)).toBe(INJECTOR);
  });

  it('should return null', () => {
    expect(getInjectorOf({})).toBe(null);
    expect(getInjectorOf(null)).toBe(null);
  });
});

describe('@Inject()', () => {
  it('should inject all dependencies of a class', () => {
    const injector = new TreeInjector();
    const fork = injector.fork();

    const Color = new InjectionToken('color');
    class Battery {}
    class Engine {}

    class Car {
      @Inject() battery: Battery;
      @Inject(Engine) engine: any;
      @Inject(Color) color: string;
    }

    injector.provide(Battery);
    injector.provide(Engine);

    injector.provide(Color, { factory: () => 'red' });
    fork.provide(Color, { factory: () => 'blue' });

    injector.provide(Car);
    fork.provide(Car);

    const redCar = injector.get(Car);
    const blueCar = fork.get(Car);

    expect(getInjectorOf(redCar)).toBe(injector);
    expect(getInjectorOf(blueCar)).toBe(fork);

    expect(redCar instanceof Car).toBe(true);
    expect(redCar.battery instanceof Battery).toBe(true);
    expect(redCar.engine instanceof Engine).toBe(true);
    expect(redCar.color).toBe('red');

    expect(blueCar instanceof Car).toBe(true);
    expect(blueCar.battery instanceof Battery).toBe(true);
    expect(blueCar.engine instanceof Engine).toBe(true);
    expect(blueCar.color).toBe('blue');
  });

  it('should throw an error if a dependency cannot be provided', () => {
    const Color = new InjectionToken('color');
    class Dependency {}
    class Test {
      @Inject(Color) color: string;
      @Inject() dependency: Dependency;
    }

    INJECTOR.provide(Test);

    const instance = INJECTOR.get(Test);
    expect(() => instance.color).toThrowError('Injector could not find a value for ' + String(Color));
    expect(() => instance.dependency).toThrowError('Injector could not find a value for class Dependency');
  });

  it('should throw an error if a dependency type is invalid', () => {
    class Test {
      @Inject() test: never;
    }

    INJECTOR.provide(Test);

    const instance = INJECTOR.get(Test);
    expect(() => instance.test).toThrowError('No type found for property test');
  });
});

describe('@Injectable', () => {
  it('should allow a class to be injected by global injector', () => {
    @Injectable()
    class InjectableClass {}
    expect(INJECTOR.get(InjectableClass) instanceof InjectableClass).toBe(true);
  });
});

describe('Documentation example', () => {
  it('should inject dependencies correctly', () => {
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
  });
});
