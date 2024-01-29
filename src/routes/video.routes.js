import { Router } from "express";
import { getVideoById } from "../controllers/video.controller.js";

const router = Router()

router.route("/:videoId").get(getVideoById)

export default router