import multer from "multer";
import path from "path";
import fs from "fs";

// 1. 폴더가 없으면 생성하는 함수
const ensureDir = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// 2. 저장소 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = "uploads/profiles";
        ensureDir(uploadPath); // 폴더 생성
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // 파일명 중복 방지: "날짜_랜덤숫자_원래이름"
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname); // 확장자 추출 (.png, .jpg)
        cb(null, `${uniqueSuffix}${ext}`);
    },
});

// 3. 파일 필터 (이미지만 허용)
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("이미지 파일(jpeg, png, gif)만 업로드 가능합니다."), false);
    }
};

export const uploadProfile = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
});

// 4. 비디오/썸네일 저장소 설정
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 필드명에 따라 폴더 분기
        if (file.fieldname === 'video') {
            const path = 'uploads/videos';
            ensureDir(path);
            cb(null, path);
        } else if (file.fieldname === 'thumbnail') {
            const path = 'uploads/thumbnails';
            ensureDir(path);
            cb(null, path);
        } else {
            cb(new Error('알 수 없는 파일 필드입니다.'), '');
        }
    },
    filename: (req, file, cb) => {
        // 한글 파일명 깨짐 방지 & 중복 방지
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        // 확장자 추출
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

// 5. 비디오용 필터
const videoFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    if (file.fieldname === 'video') {
        // 비디오 허용 확장자
        const allowed = ['video/mp4', 'video/mkv', 'video/webm', 'video/quicktime'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('지원하지 않는 동영상 형식입니다.'), false);
    } else if (file.fieldname === 'thumbnail') {
        // 이미지 허용 확장자
        const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('썸네일은 이미지 파일만 가능합니다.'), false);
    } else {
        cb(new Error('잘못된 파일 요청입니다.'), false);
    }
};

// 6. export: 용량 제한을 넉넉하게 (500MB)
export const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});