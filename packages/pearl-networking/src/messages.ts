interface BaseMessage {
  type: string;
  data?: any;
}

export interface RpcMessageData {
  entityId: string;
  componentName: string;
  methodName: string;
  args: any[];
}

export interface RpcMessage extends BaseMessage {
  type: 'rpc';
  data: RpcMessageData;
}

export interface EntitySnapshot {
  id: string;
  type: string;
  state: any;
}

export interface SnapshotMessageData {
  entities: EntitySnapshot[];
  clock: number;
}

export interface SnapshotMessage extends BaseMessage {
  type: 'snapshot';
  data: SnapshotMessageData;
}

export interface IdentityMessageData {
  id: number;
}

export interface IdentityMessage extends BaseMessage {
  type: 'identity';
  data: IdentityMessageData;
}

export interface TooManyPlayersMessage extends BaseMessage {
  type: 'tooManyPlayers';
}

export type ServerMessage =
  | RpcMessage
  | SnapshotMessage
  | IdentityMessage
  | TooManyPlayersMessage;

export interface InputKeyMessageData {
  keyCode: number;
}

export interface InputKeyDownMessage extends BaseMessage {
  type: 'keyDown';
  data: InputKeyMessageData;
}

export interface InputKeyUpMessage extends BaseMessage {
  type: 'keyUp';
  data: InputKeyMessageData;
}

export type ClientMessage = InputKeyDownMessage | InputKeyUpMessage;
