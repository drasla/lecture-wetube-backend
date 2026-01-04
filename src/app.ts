import express, { Express } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger";
import path from "path";
import passport from "passport";
import { jwtStrategy } from "./config/passport";
import authRoutes from "./routes/auth.routes";
import { clientAuthMiddleware } from "./middlewares/clientAuth.middleware";
import videoRoutes from "./routes/video.routes";
import noticeRoutes from "./routes/notice.routes";
import inquiryRoutes from "./routes/inquiry.routes";
import SubscriptionRoutes from "./routes/subscription.routes";
import commentRoutes from "./routes/comment.routes";
import channelRoutes from "./routes/channel.routes";

const app: Express = express();
const PORT = 4000;

// 1. 미들웨어 설정
app.use(cors()); // 프론트엔드와 통신 허용
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());
passport.use(jwtStrategy);

app.use(clientAuthMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/subscriptions", SubscriptionRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/channels", channelRoutes);

// 2. 정적 파일 제공 (업로드된 동영상을 브라우저에서 접근 가능하게 함)
// http://localhost:4000/uploads/파일명.mp4 로 접근 가능
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 3. Swagger 연결
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// 4. 라우터 연결 (추후 추가)
app.get("/", (req, res) => {
    res.send("WeTube Backend Server is Running!");
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`📄 Swagger Docs available at http://localhost:${PORT}/api-docs`);
});
