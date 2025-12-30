import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. 댓글 등록
export const createComment = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params; // /videos/:videoId/comments
        const { content } = req.body;
        const user = req.user as { id: number };

        if (!content) {
            return res.status(400).json({ message: "내용을 입력해주세요." });
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                authorId: user.id,
                videoId: Number(videoId),
            },
            include: {
                author: { select: { id: true, nickname: true, profileImage: true } },
            },
        });

        res.status(201).json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "댓글 등록 실패" });
    }
};

// 2. 댓글 목록 조회 (최신순)
export const getComments = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;

        const comments = await prisma.comment.findMany({
            where: { videoId: Number(videoId) },
            orderBy: { createdAt: "desc" },
            include: {
                author: { select: { id: true, nickname: true, profileImage: true } },
            },
        });

        res.status(200).json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "댓글 조회 실패" });
    }
};

// 3. 댓글 삭제 (본인만 가능)
export const deleteComment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // commentId
        const user = req.user as { id: number; role: string };

        const comment = await prisma.comment.findUnique({
            where: { id: Number(id) },
        });

        if (!comment) return res.status(404).json({ message: "댓글이 없습니다." });

        // 권한 체크: 작성자 본인 혹은 관리자
        if (comment.authorId !== user.id && user.role !== "ADMIN") {
            return res.status(403).json({ message: "삭제 권한이 없습니다." });
        }

        await prisma.comment.delete({ where: { id: Number(id) } });

        res.status(200).json({ message: "삭제되었습니다." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "댓글 삭제 실패" });
    }
};
