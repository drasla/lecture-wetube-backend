import { Router } from "express";
import {
    signup,
    login,
    checkUsername,
    updateProfile,
    checkNickname,
} from "../controllers/auth.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { uploadProfile } from "../config/multer";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/check-username", checkUsername);
router.post("/check-nickname", checkNickname); // ✨ 경로 추가
router.patch("/profile", isAuthenticated, uploadProfile.single("profileImage"), updateProfile);

export default router;
