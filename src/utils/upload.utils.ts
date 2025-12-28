import { bucket } from "../config/firebase";
import path from "path";

export const uploadToFirebase = async (
    file: Express.Multer.File,
    folder: string,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        // 1. 파일명 중복 방지 (uuid 사용 권장 또는 Date.now())
        const ext = path.extname(file.originalname);
        const filename = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

        // 2. Firebase 버킷에 파일 객체 생성
        const blob = bucket.file(filename);

        // 3. 업로드 스트림 생성
        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: file.mimetype,
            },
        });

        // 4. 에러 핸들링
        blobStream.on("error", error => {
            reject(error);
        });

        // 5. 업로드 완료 시
        blobStream.on("finish", async () => {
            // 6. 공개 접속 권한 부여 (선택사항: 보안 규칙에 따라 다름)
            // 여기서는 파일을 공개(public)로 만들고 URL을 가져옵니다.
            try {
                await blob.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
                resolve(publicUrl);
            } catch (err) {
                reject(err);
            }
        });

        // 7. 버퍼 내용을 스트림으로 쏘기 (실제 업로드 시작)
        blobStream.end(file.buffer);
    });
};
