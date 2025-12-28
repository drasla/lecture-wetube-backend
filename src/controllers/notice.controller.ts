import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. 공지사항 목록 조회 (페이지네이션)
export const getNotices = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 데이터와 전체 개수를 동시에 가져옵니다.
        const [notices, total] = await prisma.$transaction([
            prisma.notice.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" }, // 최신순
            }),
            prisma.notice.count(),
        ]);

        res.status(200).json({
            notices,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러가 발생했습니다." });
    }
};

// 2. 공지사항 상세 조회 (+ 조회수 증가)
export const getNoticeById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // 조회수 1 증가시키면서 데이터 가져오기
        const notice = await prisma.notice.update({
            where: { id: Number(id) },
            data: { viewCount: { increment: 1 } },
        });

        res.status(200).json(notice);
    } catch (error) {
        console.error(error);
        res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }
};

// 3. 공지사항 생성 (관리자용 - 추후 권한 체크 필요)
export const createNotice = async (req: Request, res: Response) => {
    try {
        const { title, content } = req.body;

        const newNotice = await prisma.notice.create({
            data: { title, content },
        });

        res.status(201).json(newNotice);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "공지사항 생성 실패" });
    }
};

// 4. 삭제 (관리자용)
export const deleteNotice = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.notice.delete({ where: { id: Number(id) } });
        res.status(200).json({ message: "삭제되었습니다." });
    } catch (error) {
        res.status(500).json({ message: "삭제 실패" });
    }
};

// 5. 공지사항 수정 (관리자용) - ✨ 추가
export const updateNotice = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;

        const updatedNotice = await prisma.notice.update({
            where: { id: Number(id) },
            data: { title, content },
        });

        res.status(200).json(updatedNotice);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "수정 실패" });
    }
};