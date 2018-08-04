export type Yieldable = Promise<any> | undefined;
export type Runnable =
  | (() => IterableIterator<Yieldable>)
  | IterableIterator<Yieldable>;

export default class CoroutineManager {
  private _routines = new Set<IterableIterator<undefined>>();

  run(gen: Runnable) {
    const iterator = typeof gen === 'function' ? gen() : gen;
    const coroutine = this.runCoroutine(iterator);

    this._routines.add(coroutine);
    return coroutine;
  }

  cancel(gen: IterableIterator<undefined>) {
    this._routines.delete(gen);
  }

  tick() {
    for (let routine of this._routines) {
      const ret = routine.next();
      if (ret.done) {
        this._routines.delete(routine);
      }
    }
  }

  private *runCoroutine(gen: IterableIterator<Yieldable>) {
    let hasValue = true; // defaults to true for first tick
    let value = null;
    let errored = false;

    while (true) {
      if (hasValue) {
        hasValue = false;

        // get the next yielded promise
        let iteratorResult: IteratorResult<Yieldable>;

        if (errored) {
          iteratorResult = gen.throw!(value);
        } else {
          iteratorResult = gen.next(value);
        }

        // if we're done, break to finish this generator too
        if (iteratorResult.done) {
          break;
        }

        const promise = iteratorResult.value;

        if (promise) {
          promise.then(
            (resolvedValue) => {
              hasValue = true;
              value = resolvedValue;
              errored = false;
            },
            (err) => {
              hasValue = true;
              value = err;
              errored = true;
            }
          );
        } else {
          hasValue = true;
          value = null;
          errored = false;
        }
      }

      yield;
    }
  }
}
