import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { userRouter } from "./routers/user";
import { storeRouter } from "./routers/store";
import { moduleRouter } from "./routers/module";
import { reviewRouter } from "./routers/review";
import { deploymentRouter } from "./routers/deployment";
import { hubRouter } from "./routers/hub";
import { agentRouter } from "./routers/agent";
import { organizationRouter } from "./routers/organization";
import { billingRouter } from "./routers/billing";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  store: storeRouter,
  module: moduleRouter,
  review: reviewRouter,
  deployment: deploymentRouter,
  hub: hubRouter,
  agent: agentRouter,
  organization: organizationRouter,
  billing: billingRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
