import { Router } from "express";
import {
    createInquiry,
    getInquiries,
    getInquiryById,
    answerInquiry,
} from "../controllers/inquiry.controller";
import { isAdmin, isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// 모든 기능은 로그인이 필요함
router.post("/", isAuthenticated, createInquiry); // 문의 등록
router.get("/", isAuthenticated, getInquiries); // 목록 조회
router.get("/:id", isAuthenticated, getInquiryById); // 상세 조회
router.patch("/:id/answer", isAuthenticated, isAdmin, answerInquiry); // 답변 등록 (관리자)

export default router;
