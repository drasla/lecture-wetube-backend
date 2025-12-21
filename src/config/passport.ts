import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

const options = {
    // 헤더의 "Authorization: Bearer 토큰값" 에서 토큰을 찾겠다.
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
};

export const jwtStrategy = new JwtStrategy(options, async (payload, done) => {
    try {
        // 토큰에 들어있는 ID로 유저를 찾는다.
        const user = await prisma.user.findUnique({
            where: { id: payload.id },
        });

        if (user) {
            return done(null, user); // 유저 찾음! (req.user에 들어감)
        } else {
            return done(null, false); // 유저 없음
        }
    } catch (error) {
        return done(error, false);
    }
});