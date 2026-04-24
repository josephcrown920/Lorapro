import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import uploadsRouter from "./uploads";
import generationsRouter from "./generations";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use(generationsRouter);
router.use(uploadsRouter);
router.use(storageRouter);

export default router;
