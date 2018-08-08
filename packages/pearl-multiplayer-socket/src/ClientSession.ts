import GroovejetClient from './groovejet/GroovejetClient';
import PeerSocket from './PeerSocket';
import debugLog from './util/debugLog';

export default class ClientSession {
  private _groovejet!: GroovejetClient;
  private _hostSocket!: PeerSocket;
  private _groovejetUrl: string;

  lobbyConnectionState: 'connecting' | 'open' | 'closed' = 'connecting';
  hostConnectionState: 'init' | 'connecting' | 'open' | 'closed' = 'init';

  onOpen = () => {};
  onClose = () => {};
  onMessage = (msg: any) => {};

  constructor(groovejetUrl: string) {
    this._groovejetUrl = groovejetUrl;
  }

  connectRoom(roomCode: string) {
    this._groovejet = new GroovejetClient({
      isHost: false,
      url: this._groovejetUrl,
      roomCode,

      onOpen: () => {
        this._onGroovejetOpen();
      },

      onHostAnswerSignal: (answer) => {
        this._onHostAnswer(answer);
      },
    });
  }

  private async _onGroovejetOpen() {
    debugLog('* client: groovejet open');
    this.lobbyConnectionState = 'open';
    this.hostConnectionState = 'connecting';

    this._hostSocket = new PeerSocket({
      onOpen: () => {
        this.hostConnectionState = 'open';
        this.onOpen();
      },
      onMessage: (evt) => {
        this.onMessage(evt.data);
      },
      onClose: () => {
        this.hostConnectionState = 'closed';
        this.onClose();
      },
    });

    const offer = await this._hostSocket.createOffer();
    this._groovejet.sendClientOfferSignal(offer);
    debugLog('* client: sent client offer signal');
  }

  private async _onHostAnswer(answer: RTCSessionDescriptionInit) {
    debugLog('* client: received answer');
    await this._hostSocket.handleAnswer(answer);
    debugLog('* client: handled answer');
  }

  send(msg: any, channelLabel: 'unreliable' | 'reliable' = 'reliable'): void {
    this._hostSocket.send(channelLabel, msg);
  }
}
