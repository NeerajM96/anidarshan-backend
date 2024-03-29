import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet, deleteTweetById, getUserTweets, updateTweet } from "../controllers/tweet.controller.js";

const router = Router()
router.route("/user/:username").get(getUserTweets)
router.use(verifyJWT)    // Apply verifyJWT middleware to all routes in this file

router.route("/create-tweet").post(createTweet)

router.route("/:tweetId").delete(deleteTweetById)
router.route("/:tweetId").patch(updateTweet)
export default router