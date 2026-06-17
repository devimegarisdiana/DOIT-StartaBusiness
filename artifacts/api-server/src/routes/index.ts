import { Router } from "express";
import roomsRouter from "./rooms.js";

const router = Router();
router.use(roomsRouter);

export default router;
