import GroovejetClient, { GroovejetError } from './groovejet/GroovejetClient';
import PeerSocket from './PeerSocket';
import debugLog from './util/debugLog';

export default class ClientSession {
  lobbyConnectionState: 'connecting' | 'open' | 'closed' = 'connecting';
  hostConnectionState: 'init' | 'connecting' | 'open' | 'closed' = 'init';

  private _groovejet!: GroovejetClient;
  private _hostSocket!: PeerSocket;
  private _groovejetUrl: string;

  /**
   * Event fired when the client has connected to the host and data can be
   * exchanged.
   */
  onOpen = () => {};

  /**
   * Event fired when the client has disconnected from the host, whether due to
   * an error or due to the host closing the game.
   */
  onClose = () => {};

  /**
   * Event fired when the client receives a message from the host.
   */
  onMessage = (msg: any) => {};

  constructor(groovejetUrl: string) {
    this._groovejetUrl = groovejetUrl;
    this._groovejet = new GroovejetClient({});
  }

  /**
   * Connect to Groovejet and receive a client identity. Returns the client ID
   * from groovejet.
   */
  async connect(): Promise<string> {
    return await this._groovejet.connect(this._groovejetUrl);
  }

  /**
   * Join a room. Resolves once the peer connection to the host is established.
   */
  async joinRoom(roomCode: string) {
    // throws GroovejetError on initial connection failure
    await this._groovejet.joinRoom(roomCode);

    this.lobbyConnectionState = 'open';
    this.hostConnectionState = 'connecting';

    // once we're ready...
    return new Promise(async (resolve, reject) => {
      this._hostSocket = new PeerSocket({
        onOpen: () => {
          this.hostConnectionState = 'open';
          this.onOpen();
          resolve();
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
      this._groovejet.onHostAnswerSignal = async (answer) => {
        await this._hostSocket.handleAnswer(answer);
      };

      this._groovejet.sendGuestOfferSignal(offer);
    });
  }

  send(msg: any, channelLabel: 'unreliable' | 'reliable' = 'reliable'): void {
    this._hostSocket.send(channelLabel, msg);
  }
}
