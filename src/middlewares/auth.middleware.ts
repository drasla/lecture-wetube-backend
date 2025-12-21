import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Role, User } from "../generated/prisma";

// 1. 로그인 여부 체크 (Passport 이용)
export const isAuthenticated = passport.authenticate("jwt", { session: false });

// 2. 관리자 권한 체크 (로그인 후 실행되어야 함)
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;

    if (!user || user.role !== Role.ADMIN) {
        return res.status(403).json({ message: "관리자 권한이 필요합니다." });
    }
    next();
};
