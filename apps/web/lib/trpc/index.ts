import { router } from "./trpc";
import { compoundRouter } from "./compound";
import { stackRouter } from "./stack";
import { cycleRouter } from "./cycle";

export const appRouter = router({
  compound: compoundRouter,
  stack: stackRouter,
  cycle: cycleRouter,
});

export type AppRouter = typeof appRouter;
