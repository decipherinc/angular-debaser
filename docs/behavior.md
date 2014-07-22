<a name="module_behaviour"></a>
#behaviour
The behaviour module is concerned with behaviour. Be on your best behaviour. It exports
a single class, entitled Behaviour.

**Example**  
```js
var Behaviour = angular.module("decipher.debaser.behavior");
```

<a name="exp_module_behaviour"></a>
##class: Behavior ⏏
The main behaviour class

**Members**

* [class: Behavior ⏏](#exp_module_behaviour)
  * [new Behavior()](#exp_new_module_behaviour)
  * [behaviour._id](#module_behaviour._id)
  * [behaviour.queue](#module_behaviour#queue)
  * [behaviour.config](#module_behaviour#config)
  * [behaviour.enqueue(calls)](#module_behaviour#enqueue)
  * [behaviour.flush()](#module_behaviour#flush)

<a name="exp_new_module_behaviour"></a>
###new Behavior()
**Params**

-  `object` - the input object
-  `string` - the aspect name

<a name="module_behaviour._id"></a>
###behaviour._id
the ID class property. Not intended for public use.

**Access**: protected  
<a name="module_behaviour#queue"></a>
###behaviour.queue
The queue

**Type**: `object`  
<a name="module_behaviour#config"></a>
###behaviour.config
The config

**Type**: `object`  
<a name="module_behaviour#enqueue"></a>
###behaviour.enqueue(calls)
Enqueue something

**Params**

- calls `array` - the calls to enqueue

**Returns**: `undefined` - nothing returned  
<a name="module_behaviour#flush"></a>
###behaviour.flush()
Flush everything

**Returns**: `array` - the results of the flushings  
