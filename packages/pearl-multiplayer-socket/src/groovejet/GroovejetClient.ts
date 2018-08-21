import debugLog from '../util/debugLog';

type OnGuestOfferSignal = (
  clientId: string,
  offerSignal: RTCSessionDescriptionInit
) => void;

type OnHostAnswerSignal = (answerSignal: RTCSessionDescriptionInit) => void;

interface GroovejetErrorMessage {
  errorMessage: string;
  errorType: string;
}

export class GroovejetError extends Error {
  type: string;

  constructor(groovejetErrorMessage: GroovejetErrorMessage) {
    super(groovejetErrorMessage.errorMessage);
    this.type = groovejetErrorMessage.errorType;
  }
}

interface GroovejetOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: GroovejetError) => void;
  onGuestOfferSignal?: OnGuestOfferSignal;
  onHostAnswerSignal?: OnHostAnswerSignal;
}

export default class GroovejetClient {
  private ws: WebSocket;
  onOpen = () => {};
  onClose = () => {};
  onError = (err: GroovejetError) => {};
  onGuestOfferSignal?: OnGuestOfferSignal;
  onHostAnswerSignal?: OnHostAnswerSignal;

  constructor(opts: GroovejetOptions) {
    if (opts.onOpen) {
      this.onOpen = opts.onOpen;
    }
    if (opts.onClose) {
      this.onClose = opts.onClose;
    }
    if (opts.onError) {
      this.onError = opts.onError;
    }

    this.onGuestOfferSignal = opts.onGuestOfferSignal;
    this.onHostAnswerSignal = opts.onHostAnswerSignal;
  }

  /**
   * Resolves with the client ID when the initial identity message is received
   */
  connect(host: string): Promise<string> {
    const protocol = document.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${host}`;

    this.ws = new WebSocket(url);

    // this.ws.onopen = this.handleOpen.bind(this);
    // this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);

    return new Promise((resolve, reject) => {
      this.ws.onopen = () => {
        this.ws.onmessage = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'identity') {
            this.ws.onmessage = () => {};
            resolve(msg.data.clientId);
          }
        };
      };
    });
  }

  /**
   * Joins an existing room. Eventually will allow you to join as host - for now
   * only as guest.
   */
  joinRoom(roomCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);

        if (msg.type === 'joinedRoom') {
          // revert to default message handler
          this.ws.onmessage = this.handleMessage;
          resolve();
        } else if (msg.type === 'error') {
          this.ws.onmessage = this.handleMessage;
          reject(new GroovejetError(msg));
        }
      };

      this.ws.send(
        JSON.stringify({
          type: 'joinRoom',
          data: {
            roomCode,
            // eventually:
            // canHost: true
          },
        })
      );
    });
  }

  /**
   * Create a room and join it. Returns the new room code.
   */
  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);

        if (msg.type === 'createdRoom') {
          // revert to default message handler
          this.ws.onmessage = this.handleMessage;
          resolve(msg.data.roomCode);
        } else if (msg.type === 'error') {
          this.ws.onmessage = this.handleMessage;
          reject({
            type: msg.errorType,
            message: msg.errorMessage,
          });
        }
      };

      this.ws.send(
        JSON.stringify({
          type: 'createRoom',
        })
      );
    });
  }

  sendGuestOfferSignal(offerSignal: RTCSessionDescriptionInit) {
    this.send({
      type: 'guestOfferSignal',
      data: {
        offerSignal,
      },
    });
  }

  sendHostAnswerSignal(
    clientId: string,
    answerSignal: RTCSessionDescriptionInit
  ) {
    this.send({
      type: 'hostAnswerSignal',
      data: {
        answerSignal,
        clientId,
      },
    });
  }

  private handleMessage = (evt: MessageEvent) => {
    const msg = JSON.parse(evt.data);

    if (msg.type === 'hostAnswerSignal') {
      this.onHostAnswerSignal!(msg.data.answerSignal);
    } else if (msg.type === 'guestOfferSignal') {
      const { clientId, offerSignal } = msg.data;
      this.onGuestOfferSignal!(clientId, offerSignal);
    } else if (msg.type === 'error') {
      this.onError(new GroovejetError(msg));
    }
  };

  private handleClose() {
    debugLog('*** Lost connection to lobby server');
    this.onClose();
  }

  private send(msg: any) {
    this.ws.send(JSON.stringify(msg));
  }
}
