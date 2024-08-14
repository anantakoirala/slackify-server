import { userSocketIds, onlineUsers } from "../index";

export const getSockets = (organizationId: string, users: string[] = []) => {
  const sockets = users.map((user) => userSocketIds.get(user)).filter(Boolean);

  return sockets;
};

export const getMultipleSockets = (
  organizationId: string,
  users: string[] = []
): string[] => {
  const sockets: string[] = [];

  // Check if the organizationId exists in onlineUsers map
  const orgUsersMap = onlineUsers.get(organizationId);

  if (!orgUsersMap) {
    return sockets; // return empty array if organization not found
  }

  // Retrieve sockets for each user
  users.forEach((user) => {
    const socketId = orgUsersMap.get(user);
    if (socketId) {
      socketId.map((socket: string) => sockets.push(socket));
    } else {
      console.warn(
        `User with ID ${user} not found in organization ${organizationId}.`
      );
    }
  });

  return sockets;
};
