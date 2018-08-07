export async function createRoom(lobbyServer: string): Promise<string> {
  const resp = await fetch(`//${lobbyServer}/rooms`, {
    method: 'POST',
  });

  // TODO: resp.ok may not exist on iPhone/Android browsers?
  if (!resp.ok) {
    throw new Error(`error creating room: ${resp.status} ${resp.statusText}`);
  }

  const { code } = await resp.json();
  return code;
}
