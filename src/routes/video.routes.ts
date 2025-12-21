import { Router } from "express";
import { uploadVideo } from "../controllers/video.controller"; // 컨트롤러
import { uploadVideo as uploadMiddleware } from "../config/multer"; // Multer 설정
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// POST /api/videos
router.post(
    "/",
    isAuthenticated, // 1. 로그인 체크
    uploadMiddleware.fields([
        // 2. 파일 업로드 처리 (두 종류)
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    uploadVideo, // 3. 컨트롤러 실행
);

export default router;
