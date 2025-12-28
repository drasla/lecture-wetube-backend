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

// 2. 문의 목록 조회 (유저: 본인 것만, 관리자: 전체)
export const getInquiries = async (req: Request, res: Response) => {
    try {
        const user = req.user as { id: number; role: string };
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 조건 설정: 관리자는 조건 없음({}), 일반 유저는 authorId 필터
        const whereCondition = user.role === "ADMIN" ? {} : { authorId: user.id };

        const [inquiries, total] = await prisma.$transaction([
            prisma.inquiry.findMany({
                where: whereCondition,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: { author: { select: { nickname: true, email: true } } }, // 작성자 정보 포함
            }),
            prisma.inquiry.count({ where: whereCondition }),
        ]);

        res.status(200).json({
            inquiries,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "목록 조회 실패" });
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

// 4. 답변 등록 (관리자 전용)
export const answerInquiry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { answer } = req.body;

        const updatedInquiry = await prisma.inquiry.update({
            where: { id: Number(id) },
            data: {
                answer,
                isAnswered: true,
                answeredAt: new Date(),
            },
        });

        res.status(200).json(updatedInquiry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "답변 등록 실패" });
    }
};
