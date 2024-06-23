import randomize from "randomatic";
import crypto from "crypto";
export const generateRandomString = () => {
  const random_string = randomize("Aa0", 6);

  return crypto.createHash("sha256").update(random_string).digest("hex");
};
