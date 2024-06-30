import { userSocketIds } from "../index";

export const getSockets = (users: string[] = []) => {
  const sockets = users.map((user) => userSocketIds.get(user)).filter(Boolean);
  console.log("sockets", sockets);
  return sockets;
};
