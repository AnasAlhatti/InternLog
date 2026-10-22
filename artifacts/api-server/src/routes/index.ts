import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { createWeeklySummaryRouter } from "./weekly-summary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(createWeeklySummaryRouter());

export default router;
