# The Troubling Saga of Donny Developer & The Infinite Fixture

Donny Developer wants to unit test a controller which manages the online interface of a pizza joint.  It looks like this:

```js
angular.module('donny.pizzajoint.admin').controller('AdminDashboardCtrl',
  function($scope, $log, $window, User, Settings, Pizza, Toppings, Sides,
    Orders, Deliveries) {

    $scope.getUsers = function getUsers() {
      return User.getAll(Settings.location_id);
    };

    $scope.getPizzas = Pizza.getAll;

    $scope.getSettings = function() {
      return Settings;
    };

    $scope.getToppings = function() {
      var toppings = [];
      // this inexplicably returns an object, so we convert to an array.
      angular.forEach(Toppings.getAll(), function(value, name) {
        toppings.push(angular.extend({}, value, {name: name}));
      });
      return toppings;
    };

    $scope.getSides = function() {
      return Sides.getAll();
    };

    $scope.getOrders = function() {
      return Orders.getPreviousWeek();
    };

    $scope.getDeliveries = function() {
      return Deliveries.getPreviousWeek();
    };
  });
```

He'll test this first function, `getUsers()`.

The first thing he needs to do is tell his test framework to configure an injector for his module.  Donny modifies his runner config to load his module and controller files.  Then, he types out a failing test, injecting `$controller` in preparation of instantiating `AdminDashboardCtrl`.

```js
describe('AdminDashboardCtrl', function() {

  beforeEach(module('donny.pizzajoint.admin'));

  it('should gather a list of users', inject(function($controller) {
    expect(true).to.be.false;
  }));

});
```

Donny expects his test to fail.  But he didn't expect his test to error like this:

```
Error: [$injector:nomod] Module 'donny.pizzajoint.common' is not available! You
 either misspelled the module name or forgot to load it. If registering a module
  ensure that you specify the dependencies as the second argument.
```

Donny realizes the `donny.pizzajoint.admin` module requires `donny.pizzajoint.common`.  He examines the `donny.pizzajoint.admin` module a little closer, and:

```js
angular.module('donny.pizzajoint.admin', ['donny.pizzajoint.common'
  'donny.pizzajoint.food', 'donny.pizzajoint.account', 'donny.pizzajoint.delivery'])
  .config(function(UserProvider) {
    UserProvider.assertAdmin();
  });
```

Four modules?  OK, well, better get to it.  He includes the module definitions for his four other modules in his test runner, and tries again.  To his dismay:

```
Error: [$injector:nomod] Module 'ui.router' is not available! You either misspelled the module name or forgot to load it. If registering a module ensure that you specify the dependencies as the second argument.
```

It appears `donny.pizzajoint.common` requires `ui.router`.  Not to be outdone, he requires the `.js` file for the 3rd-party `ui.router` in his test runner.  Donny wonders if he should really be doing this; isn't it a unit test, after all?

Now, he's able to get his test to load without a `nomod` error.  But as you can see in the `config()` block of module `donny.pizzajoint.admin`, we need to be logged in as an administrator.  Donny thinks maybe it's a bad idea to try to coerce his test runner into setting session cookies, so he attempts to stub out his provider.

> We skip the part where Donny spends 30 minutes figuring out how to stub a provider.

Donny's test now looks like this:

```js
  describe('AdminDashboardCtrl', function () {

    beforeEach(module(function ($provide) {
      $provide.provider('User', function () {
        this.assertAdmin = angular.noop;
        this.$get = angular.noop;
      });
    }));
    beforeEach(module('donny.pizzajoint.admin'));

    it('should gather a list of users', inject(function ($controller) {
      expect(true).to.be.false;
    }));
  });
```

The moons align and Donny's test fails in the way he expected:

```
AssertionError: expected true to be false
```

Awesome!  Donny bubbles with excitement as he instantiates his controller,

```js
it('should gather a list of users', inject(function ($controller, $rootScope) {
  var scope = $rootScope.$new();
  $controller('AdminDashboardCtrl', {
    $scope: scope
  });
  expect(scope.getUsers()).to.eql([]);
}));
```

and runs his test,

```
[$injector:unpr] Unknown provider: SettingsProvider <- Settings
```

Donny didn't really forget that he had to provide `Settings`; he just doesn't like to manually provide things, because nobody does.  The little devil on his left shoulder says "just include the file!" while the angel on his right shoulder pleads with him not to listen.  He relents and decides to stub `Settings`.  This one is pretty straightforward, as per his `$scope.getUsers()` function:

```js
$provide.service('Settings', function() {
  this.location_id = 1;
});
```

While he's nearby, he modifies his `User` provider to have a proper factory method:

```js
$provide.provider('User', function () {
  this.assertAdmin = angular.noop;
  this.$get = function() {
    return {
      getAll: function() {
        return [];
      }
    };
  };
});
```

Good job Donny!  His sense of accomplishment withers once he runs his test again:

```
[$injector:unpr] Unknown provider: PizzaProvider <- Pizza
```

Grumbling, he greps his source under test for `Pizza`, and finds the `$scope.getPizzas()` function.  He'll need to provide a `Pizza` factory with a `getAll()` method...

> We skip the 30 more minutes where Donny hunts around his controller for all usages of the service the Scope methods need to run, then provides them all.

Finally, Donny's test passes!

He asserted a stubbed function returns an empty array, and spent a couple hours on it!  Too bad he has no confirmation his stub in `User.getAll()` was actually called, and he had to include a bunch of unrelated files to be loaded by his test runner.

Donny thinks that next time maybe he will not worry too much about unit testing controller functions that do nothing.  His test looks like this, in its entirety:

```js
describe('AdminDashboardCtrl', function () {

  beforeEach(module(function ($provide) {
    $provide.provider('User', function () {
      this.assertAdmin = angular.noop;
      this.$get = function() {
        return {
          getAll: function() {
            return [];
          }
        };
      };
    });
    $provide.service('Settings', function() {
      this.location_id = 1;
    });
    $provide.service('Pizza', function() {
      this.getAll = function() {
        return [];
      };
    });
    $provide.service('Toppings', function() {
      this.getAll = function() {
        return {};
      };
    });
    $provide.service('Sides', function() {
      this.getAll = function() {
        return [];
      };
    });
    $provide.service('Orders', function() {
      this.getPreviousWeek = function() {
        return [];
      };
    });
    $provide.service('Deliveries', function() {
      this.getPreviousWeek = function() {
        return [];
      };
    });
  }));

  beforeEach(module('donny.pizzajoint.admin'));

  it('should gather a list of users', inject(function ($controller, $rootScope) {
    var scope = $rootScope.$new();
    $controller('AdminDashboardCtrl', {
      $scope: scope
    });
    expect(scope.getUsers()).to.eql([]);
  }));
});
```

Donny wrote about **60** lines of code to *badly* test **one** line of code.  This is why his product manager hates unit tests.  Donny doesn't like the outcome either, and decides to find a better way.

## Enter Sinon.JS

Using [Sinon.JS](http://sinonjs.org), you can easily provide stub functions and make assertions about them.  Using [Mocha](http://visionmedia.github.io/mocha/) and an assertion library like [Chai](http://chaijs.com/), combined with [sinon-chai](https://github.com/domenic/sinon-chai), makes this integration even smoother.  [jasmine-sinon](https://github.com/froots/jasmine-sinon) is also available for the Jasmine framework.

Let's take a look at Donny's test and stubs after using Sinon:

```js

  describe('AdminDashboardCtrl', function () {

    var sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create('AdminDashboardCtrl');
    });

    afterEach(function() {
      sandbox.restore();
    });

    beforeEach(module(function ($provide) {
      $provide.provider('User', function () {
        this.assertAdmin = sandbox.stub();
        this.$get = function() {
          return {
            getAll: sandbox.stub().returns([])
          };
        };
      });
      $provide.service('Settings', function() {
        this.location_id = 1;
      });
      $provide.service('Pizza', function() {
        this.getAll = sandbox.stub().returns([]);
      });
      $provide.service('Toppings', function() {
        this.getAll = sandbox.stub().returns({});
      });
      $provide.service('Sides', function() {
        this.getAll = sandbox.stub().returns([]);
      });
      $provide.service('Orders', function() {
        this.getPreviousWeek = sandbox.stub().returns([]);
      });
      $provide.service('Deliveries', function() {
        this.getPreviousWeek = sandbox.stub().returns([]);
      });
    }));

    beforeEach(module('donny.pizzajoint.admin'));

    it('should gather a list of users', inject(function ($controller, $rootScope, User) {
      var scope = $rootScope.$new();
      $controller('AdminDashboardCtrl', {
        $scope: scope
      });
      expect(scope.getUsers()).to.eql([]);
      expect(User.getAll).to.have.been.calledOnce;
    }));
  });
```

This test is now a bit more valuable, because now he can assert his stubs were called, at least.  His function is working properly.

Still, that's a lot of code.  Donny *knows* there's a more elegant solution.  He's getting smarter by the minute!

## Enter angular-debaser

Donny stumbles across *this* project, installs it via `bower` and gives it a spin.  He's able to reduce his file dependencies to the following:

3p libs:

- `angular.js`
- `angular-mocks.js`
- `angular-debaser.js`
- `sinon.js`

Files under test:

- `admin.module.js`
- `admindashboard.ctrl.js`
- `admindashboard.ctrl.spec.js`

Only the controller and the spec are included; no dependencies of modules whatsoever are included.

> You can actually get around requiring the file *declaring* the module.  Hint: it depends on the order in which files are loaded.

## The Big Payoff

His test now looks like this:

```js
describe('AdminDashboardCtrl', function () {

  beforeEach(function () {
    debaser()
      .module('donny.pizzajoint.admin')
      .object('Settings', {
        location_id: 1
      })
      .object('User').withFunc('getAll').returns([])
      .object('Pizza').withFunc('getAll').returns([])
      .object('Toppings').withFunc('getAll').returns({})
      .object('Sides').withFunc('getAll').returns([])
      .object('Orders').withFunc('getPreviousWeek').returns([])
      .object('Deliveries').withFunc('getPreviousWeek').returns([])
      .debase();
  });

  it('should gather a list of users',
    inject(function ($controller, User) {
      var scope = $controller('AdminDashboardCtrl');
      expect(scope.getUsers()).to.eql([]);
      expect(User.getAll).to.have.been.calledOnce;
    }));
});
```

It's certainly easier to write simple stubs for dependencies this way.  Good job Donny!  They lived happily ever after.

## Epilogue

Let's take a closer look at the code and explain important lines.

```js
window.debaser()
```

`window.debaser()` gives you a `Debaser` instance, which provides many goodies.  As you can see, all methods of this object are chainable; they all return the same instance.

This is typically done in a `beforeEach()` block.

> It can be done elsewhere, and you can actually name your Debaser instances and reference them later, but I haven't tested it much.  Sorry!

```js
  .module('donny.pizzajoint.admin')
```

This will detect an existing module, queue it for loading (via `angular-mocks`), and stub the `config()` block.  The stubbing behavior can be turned off via options passed to the `debaser()` function (`skipConfigs: false`).

```js
  .module('donny.pizzajoint.common')
  .module('donny.pizzajoint.food')
  .module('donny.pizzajoint.account')
  .module('donny.pizzajoint.delivery')
```

The above four lines simply stub out these modules; anything depending on them will be satisfied.

```js
  .object('Settings', {
    location_id: 1
  })
```

This provides an object based on the second parameter.  If this object contained any functions, they would be spied on via Sinon, if `sinon` object is present in the global context.  If the object was not defined, we would simply provide an empty object.

It's helpful to think in terms of *objects* and *functions* when using **angular-debaser**; it doesn't matter whether you are providing via a value, constant, service, factory, or provider--what matters is the code under test gets the correct data structure injected into it.

*Note:* You can pass an `Array`, `Date`, `RegExp`, or custom object as the second parameter to `object()`.  In theory.

> Behind the scenes, we declare an anonymous module which provides a `value()`; the value of which is the object.

```js
  .object('User').withFunc('getAll').returns([])
  .object('Pizza').withFunc('getAll').returns([])
  .object('Toppings').withFunc('getAll').returns({})
  .object('Sides').withFunc('getAll').returns([])
  .object('Orders').withFunc('getPreviousWeek').returns([])
  .object('Deliveries').withFunc('getPreviousWeek').returns([])
```

Each of these lines say, "provide an object with a function in it which returns *blah*".  If you are using Sinon.JS (just load it up with your test runner; **angular-debaser** will take care of the rest), each of the functions you can apply to a Sinon.JS "stub" are present, and each one will return an instance of Debaser.  In this case, `returns()` is actually a Sinon.JS function.  Thus, if you are *not* using Sinon.JS, `returns()` is simply not available.

> There *is* an exception to this rule (which is an exception in Sinon.JS as well): If you start using the `onCall()` function or its brethren, you don't actually get a stub function back from Sinon.JS; you get a `Stub` object, which is different.  We have you covered.  Once you are done configuring your calls, you can simply call `.end()` and you will be returned to a Debaser context.

**`<important>`**

Every line in the code above begins with what is considered a **base** function.  When you execute a **base** function (only `object()`, `func()` or `module()` at the time of this writing), you start anew, and your previous call(s) are placed into **angular-debaser**'s internal execution queue.  So, it's important to understand  *you can't go backwards*.  `withFunc()` for example, is *not* a **base** function, and will *only* be available after a call to `object()` or `module()`; otherwise, it will be `undefined` and a `TypeError` will be thrown.

**`</important>`**

> To create an AngularJS `constant`, use `module('foo').withFunc('bar')` or `module('foo').withObject('baz')`.  With option `skipConfigs: true` (the default), however, this is rarely necessary.

```js
  .debase();
```

Think of everything before this as simply items going into a bucket.  When you execute `debase()`, you tip the bucket and *magic* pours out.

Simply, once you are done configuring your stubs, execute `debase()`.

```js
var scope = $controller('AdminDashboardCtrl');
```

It's common to simply call `$rootScope.$new()` in a `beforeEach()` block and hand that Scope to the `$controller` function.  There's an option (**on** by default) `autoScope` which decorates the `$controller` function and does this work for you, then returns you the Scope it made.  Rarely are you messing with the guts of a controller instance; mostly you want to test Scope members (if anything).  This is just a handy shortcut.
