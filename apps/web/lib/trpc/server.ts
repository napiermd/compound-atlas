import { createCallerFactory } from "./trpc";
import { appRouter } from "./index";
import { createContext } from "./context";

const createCaller = createCallerFactory(appRouter);

export async function createServerCaller() {
  const ctx = await createContext();
  return createCaller(ctx);
}
