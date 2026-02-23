import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { userRouter } from "./routers/user";
import { storeRouter } from "./routers/store";
import { moduleRouter } from "./routers/module";
import { reviewRouter } from "./routers/review";

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  store: storeRouter,
  module: moduleRouter,
  review: reviewRouter,
});

export type AppRouter = typeof appRouter;
