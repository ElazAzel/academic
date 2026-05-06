import { hash, verify, type Options } from "@node-rs/argon2";

const options: Options = {
  algorithm: 2 as Options["algorithm"],
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
};

export async function hashPassword(password: string) {
  return hash(password, options);
}

export async function verifyPassword(hashValue: string, password: string) {
  return verify(hashValue, password, options);
}
