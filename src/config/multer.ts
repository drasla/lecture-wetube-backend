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
