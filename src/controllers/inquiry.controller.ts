import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. 문의 등록 (유저)
export const createInquiry = async (req: Request, res: Response) => {
    try {
        const user = req.user as { id: number };
        const { title, content } = req.body;

        const newInquiry = await prisma.inquiry.create({
            data: {
                title,
                content,
                authorId: user.id,
            },
        });

        res.status(201).json(newInquiry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "문의 등록 실패" });
    }
};

export const getMyInquiries = async (req: Request, res: Response) => {
    try {
        const user = req.user as { id: number };
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [inquiries, total] = await prisma.$transaction([
            prisma.inquiry.findMany({
                where: { authorId: user.id }, // ✨ 내 ID로만 필터링
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                // 내 문의는 작성자 정보가 굳이 필요 없거나 최소한만 있으면 됨
            }),
            prisma.inquiry.count({ where: { authorId: user.id } }),
        ]);

        res.status(200).json({
            inquiries,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "내 문의 내역 조회 실패" });
    }
};

export const getAllInquiries = async (req: Request, res: Response) => {
    try {
        const user = req.user as { id: number; role: string };
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 1. 관리자 권한 체크 (미들웨어에서도 하겠지만 이중 체크)
        if (user.role !== "ADMIN") {
            return res.status(403).json({ message: "관리자 권한이 필요합니다." });
        }

        const [inquiries, total] = await prisma.$transaction([
            prisma.inquiry.findMany({
                // where 조건 없음 (전체 조회)
                // 필요하다면 { isAnswered: false } 같은 필터 추가 가능
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: { email: true, nickname: true, profileImage: true } },
                }, // ✨ 관리자는 누가 썼는지 알아야 함
            }),
            prisma.inquiry.count(),
        ]);

        res.status(200).json({
            inquiries,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "전체 문의 내역 조회 실패" });
    }
};

// 3. 상세 조회
export const getInquiryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as { id: number; role: string };

        const inquiry = await prisma.inquiry.findUnique({
            where: { id: Number(id) },
            include: { author: { select: { id: true, nickname: true } } },
        });

        if (!inquiry) {
            return res.status(404).json({ message: "문의를 찾을 수 없습니다." });
        }

        // 권한 체크: 관리자거나, 본인이 작성한 글이어야 함
        if (user.role !== "ADMIN" && inquiry.authorId !== user.id) {
            return res.status(403).json({ message: "권한이 없습니다." });
        }

        res.status(200).json(inquiry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러" });
    }
};

export const updateInquiry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        const user = req.user as { id: number };

        // 1. 게시글 존재 확인
        const inquiry = await prisma.inquiry.findUnique({
            where: { id: Number(id) },
        });

        if (!inquiry) {
            return res.status(404).json({ message: "문의를 찾을 수 없습니다." });
        }

        // 2. 권한 확인 (본인만 가능)
        if (inquiry.authorId !== user.id) {
            return res.status(403).json({ message: "수정 권한이 없습니다." });
        }

        // 3. 업데이트
        const updated = await prisma.inquiry.update({
            where: { id: Number(id) },
            data: {
                title,
                content,
            },
        });

        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "문의 수정 실패" });
    }
};

export const deleteInquiry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as { id: number; role: string };

        // 1. 게시글 존재 확인
        const inquiry = await prisma.inquiry.findUnique({
            where: { id: Number(id) },
        });

        if (!inquiry) {
            return res.status(404).json({ message: "문의를 찾을 수 없습니다." });
        }

        // 2. 권한 확인 (본인 또는 관리자만 삭제 가능)
        if (inquiry.authorId !== user.id && user.role !== "ADMIN") {
            return res.status(403).json({ message: "삭제 권한이 없습니다." });
        }

        // 3. 삭제
        await prisma.inquiry.delete({
            where: { id: Number(id) },
        });

        res.status(200).json({ message: "문의가 삭제되었습니다." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "문의 삭제 실패" });
    }
};

// 4. 답변 등록 및 수정 (관리자 전용)
export const answerInquiry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { answer } = req.body; // 답변 내용
        const user = req.user as { id: number; role: string };

        // 1. 관리자 권한 확인
        if (user.role !== "ADMIN") {
            return res.status(403).json({ message: "관리자만 답변할 수 있습니다." });
        }

        if (!answer) {
            return res.status(400).json({ message: "답변 내용을 입력해주세요." });
        }

        // 2. 업데이트 (답변 내용 + 답변 완료 상태 + 시간)
        const updated = await prisma.inquiry.update({
            where: { id: Number(id) },
            data: {
                answer,
                isAnswered: true,
                answeredAt: new Date(),
            },
        });

        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "답변 등록 실패" });
    }
};

export const deleteAnswer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as { id: number; role: string };

        // 1. 관리자 권한 확인
        if (user.role !== "ADMIN") {
            return res.status(403).json({ message: "관리자만 답변을 삭제할 수 있습니다." });
        }

        // 2. 답변 초기화 (Update to null)
        const updated = await prisma.inquiry.update({
            where: { id: Number(id) },
            data: {
                answer: null, // 답변 내용 삭제
                isAnswered: false, // 답변 대기 상태로 변경
                answeredAt: null, // 답변 시간 초기화
            },
        });

        res.status(200).json({ message: "답변이 삭제되었습니다.", data: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "답변 삭제 실패" });
    }
};