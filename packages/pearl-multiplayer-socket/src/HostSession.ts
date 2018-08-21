import GroovejetClient from './groovejet/GroovejetClient';
import PeerSocket from './PeerSocket';
import debugLog from './util/debugLog';

type PeerId = string;

/**
 * A host connection multiplexes connections to various peers and can send and
 * receive messages to/from any of them.
 */
export default class HostSession {
  private _groovejet!: GroovejetClient;
  private _peerSockets = new Map<PeerId, PeerSocket>();
  private _groovejetUrl: string;

  onPeerOpen = (id: PeerId) => {};
  onPeerClose = (id: PeerId) => {};
  onPeerMessage = (id: PeerId, msg: any) => {};

  constructor(groovejetUrl: string) {
    this._groovejetUrl = groovejetUrl;

    this._groovejet = new GroovejetClient({
      onGuestOfferSignal: (clientId, offer) => {
        this._onClientOffer(clientId, offer);
      },
    });
  }

  /**
   * Connects to Groovejet and returns the established client ID.
   */
  async connect(): Promise<string> {
    return await this._groovejet.connect(this._groovejetUrl);
  }

  /**
   * Creates a room and begins listening for client offers there. Returns the
   * room code.
   */
  async createRoom(): Promise<string> {
    const code = await this._groovejet.createRoom();
    return code;
  }

  private async _onClientOffer(
    peerId: PeerId,
    offer: RTCSessionDescriptionInit
  ) {
    debugLog('* host: creating peer & answer');

    const peer = new PeerSocket({
      onOpen: () => {
        this.onPeerOpen(peerId);
      },
      onMessage: (evt) => {
        this.onPeerMessage(peerId, evt.data);
      },
      onClose: () => {
        this.onPeerClose(peerId);
      },
    });

    this._peerSockets.set(peerId, peer);

    const answer = await peer.handleOffer(offer);
    this._groovejet.sendHostAnswerSignal(peerId, answer);

    debugLog('* host: sent host answer');
  }

  sendPeer(
    id: PeerId,
    msg: any,
    channelLabel: 'reliable' | 'unreliable' = 'reliable'
  ) {
    const socket = this._peerSockets.get(id);
    if (!socket) {
      throw new Error(`cannot send message to nonexistent peer ${id}`);
    }

    socket.send(channelLabel, msg);
  }

  closePeerConnection(id: PeerId) {
    const socket = this._peerSockets.get(id);
    if (!socket) {
      throw new Error(`cannot close socket for nonexistent peer ${id}`);
    }
    socket.close();
    this._peerSockets.delete(id);
  }
}
