import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { uploadToFirebase } from "../utils/upload.utils";
import jwt from "jsonwebtoken";

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

// ✨ 전체 영상 목록 조회 (최신순)
export const getVideos = async (req: Request, res: Response) => {
    try {
        // 1. 쿼리 파라미터 처리 (기본값: 1페이지, 24개씩)
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 24;
        const skip = (page - 1) * limit;

        // 2. 비디오 목록과 전체 개수를 동시에 조회 (Transaction)
        const [videos, total] = await prisma.$transaction([
            prisma.video.findMany({
                skip, // 앞에서부터 몇 개 건너뛸지
                take: limit, // 몇 개 가져올지
                orderBy: { createdAt: "desc" },
                include: {
                    author: {
                        select: {
                            id: true,
                            nickname: true,
                            profileImage: true,
                        },
                    },
                },
            }),
            prisma.video.count(), // 전체 비디오 개수 카운트
        ]);

        // 3. 응답 (데이터 + 페이지네이션 정보)
        res.status(200).json({
            videos,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total, // 다음 페이지가 있는지 여부 (무한스크롤에 유용)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "영상 목록을 불러오지 못했습니다." });
    }
};

// 2. 영상 상세 조회 (+ 조회수 증가)
export const getVideoById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const videoId = Number(id);

        // 1. 토큰이 있다면 유저 ID 추출 (비로그인 유저도 조회 가능하므로 에러 처리 X)
        let currentUserId: number | null = null;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
                currentUserId = decoded.id;
            } catch (e) {
                /* 토큰 만료 등 무시 */
            }
        }

        // 2. 영상 조회 및 조회수 증가
        const video = await prisma.video.update({
            where: { id: videoId },
            data: { views: { increment: 1 } },
            include: {
                author: {
                    select: {
                        id: true,
                        nickname: true,
                        profileImage: true,
                        // ✨ 구독자 수 카운트 (선택사항)
                        _count: { select: { subscribers: true } },
                    },
                },
            },
        });

        // 시청 기록 저장 (로그인 유저만)
        if (currentUserId) {
            // @@unique([userId, videoId]) 제약조건이 있으므로 upsert 사용
            // 없으면 create, 있으면 viewedAt 시간만 update
            await prisma.videoHistory.upsert({
                where: {
                    userId_videoId: {
                        userId: currentUserId,
                        videoId: videoId,
                    },
                },
                update: { viewedAt: new Date() }, // 이미 본거면 시간 갱신
                create: {
                    userId: currentUserId,
                    videoId: videoId,
                },
            });
        }

        // 3. 좋아요 여부 확인 (로그인한 경우만)
        let isLiked = false;
        if (currentUserId) {
            const like = await prisma.videoLike.findUnique({
                where: {
                    userId_videoId: {
                        userId: currentUserId,
                        videoId: videoId,
                    },
                },
            });
            isLiked = !!like;
        }

        // ✨ 4. 구독 여부 확인 (추가됨)
        let isSubscribed = false;
        if (currentUserId && currentUserId !== video.author.id) {
            const subscription = await prisma.subscription.findUnique({
                where: {
                    subscriberId_channelId: {
                        subscriberId: currentUserId,
                        channelId: video.author.id,
                    },
                },
            });
            isSubscribed = !!subscription;
        }

        // 4. 기존 video 객체에 isLiked 추가해서 응답
        res.status(200).json({
            ...video,
            isLiked,
            isSubscribed,
            subscriberCount: video.author._count.subscribers, // ✨ 편의상 밖으로 꺼냄
        });
    } catch (error) {
        console.error(error);
        res.status(404).json({ message: "영상을 찾을 수 없습니다." });
    }
};

// ✨ 3. 좋아요 토글 (추가됨)
export const toggleLike = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const videoId = Number(id);
        const user = req.user as { id: number }; // 미들웨어 통과 후

        // 1. 이미 좋아요를 눌렀는지 확인
        const existingLike = await prisma.videoLike.findUnique({
            where: {
                userId_videoId: {
                    userId: user.id,
                    videoId: videoId,
                },
            },
        });

        if (existingLike) {
            // 2-1. 이미 있으면 -> 좋아요 취소 (삭제 & 카운트 감소)
            await prisma.$transaction([
                prisma.videoLike.delete({
                    where: { userId_videoId: { userId: user.id, videoId: videoId } },
                }),
                prisma.video.update({
                    where: { id: videoId },
                    data: { likeCount: { decrement: 1 } },
                }),
            ]);
            return res.status(200).json({ isLiked: false });
        } else {
            // 2-2. 없으면 -> 좋아요 추가 (생성 & 카운트 증가)
            await prisma.$transaction([
                prisma.videoLike.create({
                    data: { userId: user.id, videoId: videoId },
                }),
                prisma.video.update({
                    where: { id: videoId },
                    data: { likeCount: { increment: 1 } },
                }),
            ]);
            return res.status(200).json({ isLiked: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "좋아요 처리 실패" });
    }
};

// ✨ 시청 기록 목록 조회 (신규 추가)
export const getVideoHistory = async (req: Request, res: Response) => {
    try {
        const user = req.user as { id: number };
        const page = Number(req.query.page) || 1;
        const limit = 20;

        // VideoHistory 테이블에서 조회하지만, Video 정보를 포함해서 가져옴
        const histories = await prisma.videoHistory.findMany({
            where: { userId: user.id },
            orderBy: { viewedAt: "desc" }, // 최근 본 순서
            take: limit,
            // skip: (page - 1) * limit,
            include: {
                video: {
                    include: {
                        author: {
                            select: { id: true, nickname: true, profileImage: true },
                        },
                    },
                },
            },
        });

        // 프론트엔드에서 Video[] 형태로 쓰기 편하게 데이터 구조 변환
        // history.video 객체들을 추출하여 리스트로 만듦
        const videos = histories.map(history => ({
            ...history.video,
            viewedAt: history.viewedAt, // 시청 시각 정보가 필요하다면 추가
        }));

        res.status(200).json(videos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "시청 기록 조회 실패" });
    }
};

export const getLikedVideos = async (req: Request, res: Response) => {
    try {
        const user = req.user as { id: number };
        const page = Number(req.query.page) || 1;
        const limit = 20;

        // 1. VideoLike 테이블에서 조회
        const likes = await prisma.videoLike.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" }, // 최근에 좋아요 누른 순
            take: limit,
            // skip: (page - 1) * limit, // 페이지네이션 필요 시 주석 해제
            include: {
                video: {
                    include: {
                        author: {
                            select: { id: true, nickname: true, profileImage: true },
                        },
                    },
                },
            },
        });

        // 2. 프론트엔드에서 쓰기 편하게 Video 객체 배열로 변환
        const videos = likes.map(like => ({
            ...like.video,
            likedAt: like.createdAt, // (선택사항) 언제 좋아요 눌렀는지 정보가 필요하다면
        }));

        res.status(200).json(videos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "좋아요 목록 조회 실패" });
    }
};

export const getSubscribedVideos = async (req: Request, res: Response) => {
    try {
        const user = req.user as { id: number };
        const page = Number(req.query.page) || 1;
        const limit = 20;

        // Prisma 관계 쿼리:
        // "Video"를 찾는데, "author(작성자)"의 "subscribers(구독자 목록)" 중에
        // "subscriberId"가 "나(user.id)"인 경우가 하나라도 있는 비디오만 가져와라.
        const videos = await prisma.video.findMany({
            where: {
                author: {
                    subscribers: {
                        some: {
                            subscriberId: user.id,
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" }, // 최신순
            take: limit,
            // skip: (page - 1) * limit,
            include: {
                author: {
                    select: { id: true, nickname: true, profileImage: true },
                },
            },
        });

        res.status(200).json(videos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "구독 영상 목록 조회 실패" });
    }
};

export const searchVideos = async (req: Request, res: Response) => {
    try {
        const { q } = req.query; // /api/videos/search?q=검색어

        if (!q || typeof q !== "string") {
            return res.status(400).json({ message: "검색어를 입력해주세요." });
        }

        const videos = await prisma.video.findMany({
            where: {
                OR: [
                    { title: { contains: q } }, // 제목에 포함되어 있거나
                    { description: { contains: q } }, // 설명에 포함되어 있으면 검색
                ],
            },
            orderBy: { createdAt: "desc" }, // 최신순 정렬
            include: {
                author: {
                    select: { id: true, nickname: true, profileImage: true },
                },
            },
        });

        res.status(200).json(videos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "검색 중 오류가 발생했습니다." });
    }
};