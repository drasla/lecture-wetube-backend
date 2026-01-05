import { Router } from "express";
import {
    getLikedVideos,
    getSubscribedVideos,
    getVideoById,
    getVideoHistory,
    getVideos,
    searchVideos,
    toggleLike,
    uploadVideo,
} from "../controllers/video.controller"; // 컨트롤러
import { uploadVideo as uploadMiddleware } from "../config/multer"; // Multer 설정
import { isAuthenticated } from "../middlewares/auth.middleware";
import { createComment, getComments } from "../controllers/comment.controller";

const router = Router();

// POST /api/videos
router.post(
    "/",
    isAuthenticated,
    uploadMiddleware.fields([
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    uploadVideo,
);
router.get("/", getVideos); // ✨ 목록 조회 (누구나)

// ✨ 시청 기록 조회 (순서 중요! /:id 보다 위에 있어야 함)
// 만약 아래에 있으면 "history"라는 문자열을 id로 인식해서 에러가 날 수 있음
router.get("/history", isAuthenticated, getVideoHistory);
router.get("/liked", isAuthenticated, getLikedVideos);
router.get("/subscribed", isAuthenticated, getSubscribedVideos);
router.get("/search", searchVideos);

router.get("/:id", getVideoById); // ✨ 상세 조회 (누구나)
router.post("/:id/like", isAuthenticated, toggleLike);
// ✨ 댓글 조회 및 등록
router.get("/:videoId/comments", getComments);
router.post("/:videoId/comments", isAuthenticated, createComment);

export default router;
