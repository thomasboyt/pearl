import {
  HostSession as RealHostSession,
  ClientSession as RealClientSession,
} from 'pearl-multiplayer-socket';

type PublicPart<T> = { [K in keyof T]: T[K] };

export class HostSession implements PublicPart<RealHostSession> {
  onPeerOpen: (id: string) => void;
  onPeerClose: (id: string) => void;
  onPeerMessage: (id: string, msg: any) => void;

  async connect(): Promise<string> {
    return Promise.resolve('clientId');
  }

  async createRoom(): Promise<string> {
    return Promise.resolve('roomCode');
  }

  sendPeer: (
    id: string,
    msg: any,
    channelLabel?: 'reliable' | 'unreliable'
  ) => void = jest.fn();

  closePeerConnection(id: string): void {
    return;
  }
}

export class ClientSession implements PublicPart<RealClientSession> {
  lobbyConnectionState: 'connecting' | 'open' | 'closed';
  hostConnectionState: 'connecting' | 'open' | 'closed' | 'init';

  onOpen: () => void;
  onClose: () => void;
  onMessage: (msg: any) => void;

  async connect(): Promise<string> {
    return Promise.resolve('clientId');
  }

  async joinRoom(roomCode: string) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.onOpen();
        resolve();
      });
    });
  }

  send: (
    msg: any,
    channelLabel?: 'unreliable' | 'reliable' | undefined
  ) => void = jest.fn();
}
