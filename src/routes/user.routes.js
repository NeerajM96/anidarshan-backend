import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router =  Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,logoutUser) 

router.route("/refresh-token").post(refreshAccessToken)

router.route("/update-avatar").post(
    upload.single("avatar"),
    verifyJWT, updateUserAvatar
    )

router.route("/update-cover-image").post(
    upload.single("coverImage"),
    verifyJWT, updateUserCoverImage
    )

// by using 'export default' we can name this export whatever we want during importing it other files
export default router