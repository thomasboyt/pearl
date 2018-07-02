import CoroutineManager from './coroutine';

describe('coroutines', () => {
  describe('yield empty', () => {
    it('runs on next tick', (done) => {
      const manager = new CoroutineManager();

      manager.run(function*() {
        yield;
        done();
      });

      manager.tick();
      manager.tick();

      expect((manager as any)._routines.size).toBe(0);
    });
  });

  describe('yield promise', () => {
    it('continues on resolve', (done) => {
      const manager = new CoroutineManager();
      const p = Promise.resolve('p');

      manager.run(function*() {
        yield p;
        done();
      });

      manager.tick();

      p.then(() => {
        setTimeout(() => {
          manager.tick();
        }, 0);
      });
    });

    it('throws on error', (done) => {
      const manager = new CoroutineManager();
      const p = Promise.reject('p');

      manager.run(function*() {
        try {
          yield p;
        } catch (e) {
          done();
        }
      });

      manager.tick();

      p.catch(() => {
        setTimeout(() => {
          manager.tick();
        }, 0);
      });
    });
  });

  describe('canceling coroutines', () => {
    it('works', (done) => {
      const manager = new CoroutineManager();
      const p = Promise.resolve('p');

      let continued = false;
      const co = manager.run(function*() {
        yield p;
        continued = true;
      });

      manager.tick();

      manager.cancel(co);

      p.then(() => {
        setTimeout(() => {
          manager.tick();
          expect(continued).toBe(false);
          done();
        }, 0);
      });
    });
  });
});
