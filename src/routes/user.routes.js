import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router =  Router()

router.route("/register").post(registerUser)

// by using 'export default' we can name this export whatever we want during importing it other files
export default router