import randomize from "randomatic";
import crypto from "crypto";
export const generateVerificationCode = () => {
  const random_string = randomize("Aa0", 6);

  const hash = crypto.createHash("sha256").update(random_string).digest("hex");
  return { random_string, hash };
};
