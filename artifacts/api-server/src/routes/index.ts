import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import conversationsRouter from "./conversations";
import usersRouter from "./users";
import presenceRouter from "./presence";
import callHistoryRouter from "./call-history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(conversationsRouter);
router.use(usersRouter);
router.use(presenceRouter);
router.use("/call-history", callHistoryRouter);

export default router;
