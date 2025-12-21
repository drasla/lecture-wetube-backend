import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

// 1. 비밀번호 암호화 (회원가입 시 사용)
export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

// 2. 비밀번호 비교 (로그인 시 사용)
export const comparePassword = async (plain: string, hashed: string): Promise<boolean> => {
    return await bcrypt.compare(plain, hashed);
};

// 3. JWT 토큰 생성 (로그인 성공 시 발급)
export const generateToken = (userId: number): string => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1d' }); // 1일 유효
};