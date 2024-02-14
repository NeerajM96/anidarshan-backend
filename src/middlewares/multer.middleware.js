import multer from "multer";
import { validateFileType } from "../validators/file.validator.js";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        //   cb is call back function
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});

const limits = {
    fileSize: process.env.MAX_VIDEO_SIZE
}

export const upload = multer({ 
        storage, 
        limits, 
        fileFilter:  (req,file,cb) =>{
            validateFileType(file,cb)
        } 
});
