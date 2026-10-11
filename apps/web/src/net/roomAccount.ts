/** Guests skip the room ticket request, which would only fail; ranked play always asks for one. */
let signedIn = false;

export function setRoomTicketAccount(hasAccount: boolean): void {
  signedIn = hasAccount;
}

export function hasRoomTicketAccount(): boolean {
  return signedIn;
}
