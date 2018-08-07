# pearl-multiplayer-socket

This "socket" module is an opinionated module for handling host-client networking for Pearl games. It can be used independently, though.

Currently, it only supports WebRTC as a transport, using [Groovejet](https://github.com/thomasboyt/groovejet) as a lobby/signaling server. The goal, eventually, is to make it possible to run Pearl in a Node server as a host, with players as clients, using the same interface, by swapping out `PeerSocket` with a different class representing a WebSocket connection.