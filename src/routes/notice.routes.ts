import { isAdmin, isAuthenticated } from "../middlewares/auth.middleware";
import {
    createNotice,
    deleteNotice,
    getNoticeById,
    getNotices,
    updateNotice,
} from "../controllers/notice.controller";
import { Router } from "express";

const router = Router();

// 누구나 조회 가능
router.get("/", getNotices);
router.get("/:id", getNoticeById);

// ✨ 관리자만 생성/삭제 가능
// 순서 중요: 1.로그인했니? -> 2.관리자니? -> 3.실행
router.post("/", isAuthenticated, isAdmin, createNotice);
router.delete("/:id", isAuthenticated, isAdmin, deleteNotice);
router.patch("/:id", isAuthenticated, isAdmin, updateNotice);

export default router;
