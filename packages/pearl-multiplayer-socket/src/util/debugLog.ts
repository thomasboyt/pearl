// to use: configure Webpack to inject ENABLE_SOCKET_LOG: true
const ENABLE_SOCKET_LOG = process.env.ENABLE_SOCKET_LOG !== undefined;

export default function debugLog(...msgs: any[]) {
  if (ENABLE_SOCKET_LOG) {
    console.log(...msgs);
  }
}
