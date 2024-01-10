import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req,res) => {
    // Steps:
    // get User Details from front-end
    // validation of input - !empty
    // check if user already exists: username, email
    // check for images and avatar
    // upload them to cloudinary, check if avatar uploaded to cloudinary
    // create user object - create entry in DB
    // remove password & refresh token fields from response
    // check for user creation
    // return res

    // 1
    const {fullName, email, username, password} = req.body

    // 2
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    // 3
    const existedUser = await User.findOne({
        $or: [{email},{username}]
    })

    if (existedUser){
        throw new ApiError(409, "User with Email or Username already exists")
    }

    // 4
    const avatarLocalPath = req.files?.avatar[0]?.path
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    } 

    if (!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    // 5
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    // 6
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // 7
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // 8
    if (!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    
    return res.status(201).json(
        new ApiResponse(200,createdUser, "User Registered Successfully")
    )
})

// if we are exporting like below 'export {register}', then we have to use '{}' during importing it in other files
export {registerUser}