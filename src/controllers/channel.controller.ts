import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const getChannel = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // 조회할 채널(유저)의 ID
        const channelId = Number(id);

        // 1. 로그인한 유저 확인 (구독 여부 확인용)
        let currentUserId: number | null = null;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
                currentUserId = decoded.id;
            } catch {}
        }

        // 2. 채널 정보 + 비디오 목록 조회
        const channel = await prisma.user.findUnique({
            where: { id: channelId },
            select: {
                id: true,
                email: true,
                nickname: true,
                profileImage: true,
                _count: {
                    select: {
                        subscribers: true, // 구독자 수
                        videos: true, // 동영상 수
                    },
                },
                videos: {
                    orderBy: { createdAt: "desc" }, // 최신순 정렬
                    include: {
                        author: {
                            select: { id: true, nickname: true, profileImage: true },
                        },
                    },
                },
            },
        });

        if (!channel) {
            return res.status(404).json({ message: "채널을 찾을 수 없습니다." });
        }

        // 3. 내가 이 채널을 구독했는지 확인
        let isSubscribed = false;
        if (currentUserId && currentUserId !== channelId) {
            const sub = await prisma.subscription.findUnique({
                where: {
                    subscriberId_channelId: {
                        subscriberId: currentUserId,
                        channelId: channelId,
                    },
                },
            });
            isSubscribed = !!sub;
        }

        // 4. 응답 구성
        res.status(200).json({
            ...channel,
            isSubscribed,
            subscriberCount: channel._count.subscribers,
            videoCount: channel._count.videos,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "채널 정보를 불러오지 못했습니다." });
    }
};
