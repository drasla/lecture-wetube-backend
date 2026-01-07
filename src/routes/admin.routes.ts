import { Router } from "express";
import {
    deleteVideoByAdmin,
    getAllUsers,
    getAllVideos,
    getDashboardStats,
} from "../controllers/admin.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// 모든 /api/admin/* 요청은 인증 필요
router.use(isAuthenticated);

// GET /api/admin/users
router.get("/users", getAllUsers);
router.get("/stats", getDashboardStats);
router.get("/videos", getAllVideos);       // 목록 조회
router.delete("/videos/:id", deleteVideoByAdmin); // 강제 삭제

export default router;