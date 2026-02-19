import { router } from "./trpc";
import { compoundRouter } from "./compound";
import { stackRouter } from "./stack";
import { cycleRouter } from "./cycle";
import { userRouter } from "./user";

export const appRouter = router({
  compound: compoundRouter,
  stack: stackRouter,
  cycle: cycleRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
