import { Router } from "express";
import { getChannel } from "../controllers/channel.controller";

const router = Router();

// 채널 상세 조회 (누구나 접근 가능)
router.get("/:id", getChannel);

export default router;
