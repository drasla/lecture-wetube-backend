import { Request, Response, NextFunction } from 'express';

export const clientAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // 1. 예외 처리: Swagger 문서나 정적 파일(업로드 영상)은 검사하지 않음
    if (req.path.startsWith('/api-docs') || req.path.startsWith('/uploads')) {
        return next();
    }

    // 2. 헤더에서 키 꺼내기 (x-client-key라는 이름으로 받기로 약속)
    const clientKey = req.headers['x-client-key'];

    // 3. 키가 없거나 틀리면 403 Forbidden 에러
    if (!clientKey || clientKey !== process.env.API_CLIENT_KEY) {
        return res.status(403).json({
            message: '유효하지 않은 클라이언트 요청입니다. (Forbidden)'
        });
    }

    // 4. 통과
    next();
};