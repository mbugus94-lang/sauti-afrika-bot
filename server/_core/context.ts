import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const buildDevUser = (): User => ({
  id: ENV.devUserId,
  openId: ENV.devUserOpenId,
  name: ENV.devUserName,
  email: null,
  loginMethod: "dev",
  role: ENV.devUserRole === "admin" ? "admin" : "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
});

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  if (ENV.disableAuth) {
    return {
      req: opts.req,
      res: opts.res,
      user: buildDevUser(),
    };
  }

  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
