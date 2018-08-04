# CoroutineManager

Module used in [Pearl](https://github.com/thomasboyt/pearl) to manage coroutines as part of its run loop.

Coroutines are generators that yield promises. They can also yield nothing, to indicate that they should just run on the next tick.

Coroutines differ from traditional async functions in that their execution is tied into runloop ticks. When a promise resolves, rather than resume on the next _environment-internal_ runloop tick like a regular async function, they will not resume until the next _userland_ tick.

In addition, coroutines can be *canceled* with the `cancel()` method. While this will not cancel the yielded promise, it will prevent the coroutine from continuing execution when the promise resolves.

## Example usage

```ts
import CoroutineManager from '@tboyt/coroutine-manager';

const manager = new CoroutineManager();

const timeout = (ms: number) =>
  new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });

manager.run(function*() {
  console.log('running with timeout');
  yield timeout(500);
  console.log('done!');
});

const coroutine = manager.run(function*() {
  console.log('running with timeout, but canceling');
  setTimeout(() => manager.cancel(coroutine), 100);
  yield timeout(500);
  console.log('this never gets run!');
});

setInterval(() => manager.tick(), 100);
```