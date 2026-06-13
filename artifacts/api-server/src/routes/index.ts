import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clinicalTrialsRouter from "./clinical-trials";
import researchRouter from "./research";
import datasetRouter from "./dataset";
import evidenceRouter from "./evidence";
import exportRouter from "./export";
import stubsRouter from "./stubs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clinicalTrialsRouter);
router.use(researchRouter);
router.use(datasetRouter);
router.use(evidenceRouter);
router.use(exportRouter);
router.use(stubsRouter);

export default router;
