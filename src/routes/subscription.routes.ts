import { isAuthenticated } from "../middlewares/auth.middleware";
import { toggleSubscription } from "../controllers/subscription.controller";
import { Router } from "express";

const router = Router();

// POST /api/subscriptions/:channelId
router.post("/:channelId", isAuthenticated, toggleSubscription);

export default router;
