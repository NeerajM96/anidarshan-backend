import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // helps in managing file system on server

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload( localFilePath, {resource_type: "auto"})
        fs.unlinkSync(localFilePath)
        return response

    } catch (error) {

        // removes the locally saved temporary file as the upload operation got failed
        fs.unlinkSync(localFilePath)
        return null
    }
}

// KIM: If we delete an asset from product environment, there may be cached copies of it on CDN, so it will still be accessible to users,
// if we want to make sure it is not accessible from CDN, then we need invalidate CDN cache to true
const deleteOldUploadOnCloudinary = async (oldFileCloudPath) => {
    // get file publicId from path
    const splitPathArr = ((oldFileCloudPath)+"").split("/")
    const n = splitPathArr.length
    const filePublicId = splitPathArr[n-1].split(".")[0]
    
    try {
        const response =  await cloudinary.uploader.destroy(
            filePublicId,
            { invalidate: true }
        )

        return response

    } catch (error) {
        return null
    }
}

export { uploadOnCloudinary, deleteOldUploadOnCloudinary}