import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 관리자용 전체 회원 조회
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        // 1. 관리자 권한 확인 (라우터 미들웨어에서도 하겠지만 이중 검증)
        const user = req.user as { role: string };
        if (user.role !== "ADMIN") {
            return res.status(403).json({ message: "접근 권한이 없습니다." });
        }

        const page = Number(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const [users, total] = await prisma.$transaction([
            prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    email: true,
                    nickname: true,
                    role: true,
                    createdAt: true,
                    profileImage: true,
                    _count: { select: { videos: true, comments: true } }
                }
            }),
            prisma.user.count(),
        ]);

        res.status(200).json({ users, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "회원 목록 조회 실패" });
    }
};

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // 관리자 권한 체크
        const user = req.user as { role: string };
        if (user.role !== "ADMIN") {
            return res.status(403).json({ message: "권한이 없습니다." });
        }

        // 병렬로 데이터 조회 ($transaction 사용)
        const [
            userCount,
            videoCount,
            viewSum,     // 총 조회수 합계
            inquiryCount, // 답변 대기중인 문의 수
            recentUsers,
            recentVideos
        ] = await prisma.$transaction([
            prisma.user.count(),
            prisma.video.count(),
            prisma.video.aggregate({ _sum: { views: true } }),
            prisma.inquiry.count({ where: { isAnswered: false } }), // 미답변 문의

            // 최근 가입 회원 5명
            prisma.user.findMany({
                take: 5,
                orderBy: { createdAt: "desc" },
                select: { id: true, email: true, nickname: true, createdAt: true, profileImage: true }
            }),

            // 최근 업로드 영상 5개
            prisma.video.findMany({
                take: 5,
                orderBy: { createdAt: "desc" },
                include: { author: { select: { nickname: true } } }
            })
        ]);

        res.status(200).json({
            stats: {
                totalUsers: userCount,
                totalVideos: videoCount,
                totalViews: viewSum._sum.views || 0,
                pendingInquiries: inquiryCount
            },
            recentUsers,
            recentVideos
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "대시보드 데이터 조회 실패" });
    }
};

export const getAllVideos = async (req: Request, res: Response) => {
    try {
        const user = req.user as { role: string };
        if (user.role !== "ADMIN") return res.status(403).json({ message: "권한 없음" });

        const page = Number(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const [videos, total] = await prisma.$transaction([
            prisma.video.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: { nickname: true, email: true } }, // 작성자 정보
                    _count: { select: { comments: true, likes: true } } // 댓글, 좋아요 수
                }
            }),
            prisma.video.count(),
        ]);

        res.status(200).json({ videos, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "영상 목록 조회 실패" });
    }
};

// ✨ [추가] 관리자용 영상 강제 삭제
export const deleteVideoByAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as { role: string };
        if (user.role !== "ADMIN") return res.status(403).json({ message: "권한 없음" });

        // 영상 존재 확인
        const video = await prisma.video.findUnique({ where: { id: Number(id) } });
        if (!video) return res.status(404).json({ message: "영상을 찾을 수 없습니다." });

        // 삭제 (파일 삭제 로직은 생략, DB 레코드만 삭제)
        // 실제 서비스에선 fs.unlink로 파일도 지워야 함
        await prisma.video.delete({ where: { id: Number(id) } });

        res.status(200).json({ message: "관리자 권한으로 영상이 삭제되었습니다." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "영상 삭제 실패" });
    }
};