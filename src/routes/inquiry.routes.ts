import { Router } from "express";
import {
    createInquiry,
    getInquiryById,
    answerInquiry,
    updateInquiry,
    deleteAnswer,
    deleteInquiry,
    getAllInquiries,
    getMyInquiries,
} from "../controllers/inquiry.controller";
import { isAdmin, isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// 모든 기능은 로그인이 필요함
router.post("/", isAuthenticated, createInquiry); // 문의 등록
router.get("/", isAuthenticated, getMyInquiries); // 목록 조회
router.get("/all", isAuthenticated, getAllInquiries);
router.get("/:id", isAuthenticated, getInquiryById); // 상세 조회
router.delete("/:id", isAuthenticated, deleteInquiry);
router.patch("/:id", isAuthenticated, updateInquiry);
router.patch("/:id/answer", isAuthenticated, isAdmin, answerInquiry); // 답변 등록 (관리자)
router.delete("/:id/answer", isAuthenticated, deleteAnswer);

export default router;
