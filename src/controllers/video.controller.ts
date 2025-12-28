import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { uploadToFirebase } from "../utils/upload.utils";

const prisma = new PrismaClient();

export const uploadVideo = async (req: Request, res: Response) => {
    try {
        // 1. 파일 확인
        // Multer가 fields로 받으면 req.files는 배열이 아니라 객체입니다.
        // 타입 단언을 통해 Express.Multer.File[] 형태임을 알려줍니다.
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        const videoFile = files["video"] ? files["video"][0] : null;
        const thumbnailFile = files["thumbnail"] ? files["thumbnail"][0] : null;

        if (!videoFile || !thumbnailFile) {
            return res
                .status(400)
                .json({ message: "비디오와 썸네일 파일을 모두 업로드해야 합니다." });
        }

        // ✨ Firebase 업로드 실행 (병렬 처리)
        const [videoUrl, thumbnailUrl] = await Promise.all([
            uploadToFirebase(videoFile, "videos"), // videos 폴더에 저장
            uploadToFirebase(thumbnailFile, "thumbnails"), // thumbnails 폴더에 저장
        ]);

        const { title, description, hashtags } = req.body;
        const user = req.user as { id: number };

        let hashtagObj: { where: { name: string }; create: { name: string } }[] = [];
        if (hashtags) {
            const parsedTags = JSON.parse(hashtags) as string[];
            hashtagObj = parsedTags.map(tag => ({
                where: { name: tag },
                create: { name: tag },
            }));
        }

        // 3. DB 저장
        // 윈도우 역슬래시(\) -> 슬래시(/) 변환
        const newVideo = await prisma.video.create({
            data: {
                title,
                description,
                videoPath: videoUrl, // Firebase URL
                thumbnailPath: thumbnailUrl, // Firebase URL
                authorId: user.id,

                // ✨ 해시태그 연결 로직
                hashtags: {
                    connectOrCreate: hashtagObj,
                },
            },
            include: {
                // 응답에 해시태그 포함시키기
                hashtags: true,
            },
        });

        res.status(201).json({
            message: "비디오 업로드 성공",
            video: newVideo,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러가 발생했습니다." });
    }
};
