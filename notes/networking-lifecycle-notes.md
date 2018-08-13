Entity creation

- `createNetworkedPrefab()` will call `pearl.add()`
- at end of frame (lateUpdate), `NetworkingHost` sends snapshot of new entity containing created, but not initialized, information
- initialize() called on both ends
- first snapshot will contain initialized data
- in general, entities that need to be ready to go on the client on frame 1 should ensure all data is set up _before_ initialization

Entity destruction

- Entities currently send a message immediately on destruction from host, meaning no further snapshot is sent after destruction
- This may change slightly in the future so destruction messages are enqueued and sent at end of frame
- May send snapshot of state after destruction - this is maybe fine?