import { Request, Response } from "express";
import { hashPassword, comparePassword, generateToken } from "../utils/auth.utils";
import { Gender, PrismaClient, Role } from "../generated/prisma";

const prisma = new PrismaClient();

// 회원가입
export const signup = async (req: Request, res: Response) => {
    try {
        const {
            username,
            email,
            password,
            nickname,
            birthDate,
            phoneNumber,
            gender,
            zipCode,
            address1,
            address2,
            profileImage,
        } = req.body;

        // 1. 이미 있는 이메일인지 확인
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });
        if (existingUser) {
            return res.status(400).json({ message: "이미 존재하는 ID 또는 이메일입니다." });
        }

        // 2. 비밀번호 암호화
        const hashedPassword = await hashPassword(password);

        // 3. 유저 생성
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                nickname,
                birthDate,
                phoneNumber,
                gender: gender as Gender,
                zipCode,
                address1,
                address2,
                profileImage: profileImage || null,
                role: Role.USER,
            },
        });

        res.status(201).json({ message: "회원가입 성공!", userId: user.id });
    } catch (error) {
        res.status(500).json({ message: "서버 에러가 발생했습니다." });
    }
};

// 로그인
export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        // 1. 유저 확인
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: "이메일 또는 비밀번호가 틀렸습니다." });
        }

        // 2. 비밀번호 일치 확인
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "이메일 또는 비밀번호가 틀렸습니다." });
        }

        // 3. 토큰 발급
        const token = generateToken(user.id);

        res.status(200).json({
            message: "로그인 성공",
            token, // 프론트엔드는 이 토큰을 저장해야 함
            user: { id: user.id, nickname: user.nickname, email: user.email },
        });
    } catch (error) {
        res.status(500).json({ message: "서버 에러가 발생했습니다." });
    }
};

export const checkUsername = async (req: Request, res: Response) => {
    try {
        const { username } = req.body;

        // 1. 빈 값 체크
        if (!username) {
            return res.status(400).json({ message: "아이디를 입력해주세요." });
        }

        // 2. DB 조회
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (user) {
            // 이미 있음
            return res.status(200).json({
                isAvailable: false,
                message: "이미 사용 중인 아이디입니다.",
            });
        } else {
            // 없음 (사용 가능)
            return res.status(200).json({
                isAvailable: true,
                message: "사용 가능한 아이디입니다.",
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러가 발생했습니다." });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        // 1. 로그인된 유저 ID 가져오기 (req.user는 passport가 만들어줌)
        // 타입 단언을 통해 id가 있다고 알려줍니다.
        const user = req.user as { id: number };
        if (!user) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }

        const { nickname, phoneNumber, zipCode, address1, address2 } = req.body;

        // 2. 파일이 업로드되었는지 확인
        let profileImagePath = undefined;
        if (req.file) {
            // 윈도우의 역슬래시(\)를 슬래시(/)로 바꿔줘야 브라우저에서 잘 보입니다.
            profileImagePath = `/uploads/profiles/${req.file.filename}`;
        }

        // 3. DB 업데이트
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                nickname,
                phoneNumber,
                zipCode,
                address1,
                address2,
                // 이미지가 있을 때만 업데이트 (undefined면 Prisma가 건드리지 않음)
                profileImage: profileImagePath,
            },
        });

        res.status(200).json({
            message: "프로필이 수정되었습니다.",
            user: {
                nickname: updatedUser.nickname,
                profileImage: updatedUser.profileImage,
                phoneNumber: updatedUser.phoneNumber,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러가 발생했습니다." });
    }
};
