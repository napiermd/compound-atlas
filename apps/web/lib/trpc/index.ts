import { router } from "./trpc";
import { compoundRouter } from "./compound";
import { stackRouter } from "./stack";
import { cycleRouter } from "./cycle";
import { userRouter } from "./user";
import { healthProfileRouter } from "./healthProfile";
import { labsRouter } from "./labs";
import { personalizedStacksRouter } from "./personalizedStacks";

export const appRouter = router({
  compound: compoundRouter,
  stack: stackRouter,
  cycle: cycleRouter,
  user: userRouter,
  healthProfile: healthProfileRouter,
  labs: labsRouter,
  personalizedStacks: personalizedStacksRouter,
});

export type AppRouter = typeof appRouter;
