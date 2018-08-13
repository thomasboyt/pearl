The big picture goal for Pearl networking looks something like this:

Pearl networking will support peer-to-peer networking via WebRTC, _or_ dedicated-server networking via WebSockets (and _potentially_ via WebRTC on the server, though I think that will require different code than what's used for host peers).

To run on the server, Pearl will have a "headless" mode that skips rendering (and, probably, throwing a runtime error if you attempt to access `renderer` at all) and registering input handlers. I'm not sure what letting the server manage multiple sessions will look like yet.


cool idea for server networking:

groovejet will act as a matchmaking server, handling the concept of a "room," etc. if "dedicated" mode is enabled:

- if using webrtc, will act as a signaling server to an upstream pearl instance using node-webrtc
- if using websockets, will proxy through a websocket connection to an upstream pearl instance, maybe???