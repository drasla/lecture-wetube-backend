import { Router } from "express";
import { deleteComment } from "../controllers/comment.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// 댓글 삭제 (DELETE /api/comments/:id)
router.delete("/:id", isAuthenticated, deleteComment);

export default router;
