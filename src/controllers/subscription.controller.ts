import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 구독 토글 (구독 <-> 구독취소)
export const toggleSubscription = async (req: Request, res: Response) => {
    try {
        const { channelId } = req.params; // 구독할 대상 ID
        const user = req.user as { id: number }; // 나 (로그인한 유저)
        const targetId = Number(channelId);

        // 1. 자기 자신 구독 방지
        if (user.id === targetId) {
            return res.status(400).json({ message: "자신을 구독할 수 없습니다." });
        }

        // 2. 이미 구독 중인지 확인
        const existing = await prisma.subscription.findUnique({
            where: {
                subscriberId_channelId: {
                    subscriberId: user.id,
                    channelId: targetId,
                },
            },
        });

        if (existing) {
            // 3-1. 구독 취소
            await prisma.subscription.delete({
                where: {
                    subscriberId_channelId: {
                        subscriberId: user.id,
                        channelId: targetId,
                    },
                },
            });
            return res.status(200).json({ isSubscribed: false });
        } else {
            // 3-2. 구독 하기
            await prisma.subscription.create({
                data: {
                    subscriberId: user.id,
                    channelId: targetId,
                },
            });
            return res.status(200).json({ isSubscribed: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "구독 처리 실패" });
    }
};
