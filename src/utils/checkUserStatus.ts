export function checkUserStatus(
  userId: string,
  rooms: { [roomId: string]: { [userId: string]: string[] } }
) {
  let userRoom: string | null = null;
  let hasOtherUsers: boolean = false;
  let isCompletePair: boolean = false;

  for (const roomId in rooms) {
    if (rooms.hasOwnProperty(roomId)) {
      const roomUsers = rooms[roomId];

      if (roomUsers.hasOwnProperty(userId)) {
        userRoom = roomId;
        const userCount = Object.keys(roomUsers).length;

        // Check if there are other users besides the given user
        hasOtherUsers = userCount > 1;

        // Check if it's a complete pair (i.e., exactly two users in the room)
        isCompletePair = userCount === 2;

        break;
      }
    }
  }

  return {
    userRoom,
    hasOtherUsers,
    isCompletePair,
  };
}
