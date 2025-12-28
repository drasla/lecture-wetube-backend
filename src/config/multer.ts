// src/config/multer.ts
import multer from "multer";

// ✨ 중요: DiskStorage -> MemoryStorage로 변경
// 파일을 서버 디스크에 저장하지 않고, RAM(Buffer)에 잠시 들고 있습니다.
const storage = multer.memoryStorage();

// 파일 필터 (기존 로직 재사용)
const videoFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    if (file.fieldname === "video") {
        const allowed = ["video/mp4", "video/mkv", "video/webm", "video/quicktime"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error("지원하지 않는 동영상 형식입니다."), false);
    } else if (file.fieldname === "thumbnail") {
        const allowed = ["image/jpeg", "image/png", "image/jpg"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error("썸네일은 이미지 파일만 가능합니다."), false);
    } else {
        cb(new Error("잘못된 파일 요청입니다."), false);
    }
};

// 3. 프로필 이미지 필터 (이미지만 허용)
const profileFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
};


export const uploadVideo = multer({
    storage: storage,
    fileFilter: videoFileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// 5. export: 프로필 업로드용 (이미지 1개) ✨ 복구 완료!
export const uploadProfile = multer({
    storage: storage,
    fileFilter: profileFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});