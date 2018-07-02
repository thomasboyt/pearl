import CoroutineManager from '../src/coroutine';

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
