import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    // //TODO: get all videos based on query, sort, pagination
    // const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    const { userId, username } = req.query
    const pipeline = []
    let user;
    if(username){
        user = await User.findOne({username})
    }

    if(user){
        pipeline.push({
            $match: {
                owner:new mongoose.Types.ObjectId(user._id)
            }
        })
    }
    else{
        pipeline.push(
            {
                $match:{}
            }
        )
    }

    pipeline.push({
        $lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"owner"
        }
    },
    {
        $unwind:"$owner"
    },
    {
        $addFields:{
            fullName:"$owner.fullName",
            avatar:"$owner.avatar",
        }
    },
    {
        $project:{
            videoFile:1,
            thumbnail:1,
            title:1,
            description:1,
            duration:1,
            views:1,
            fullName:1,
            avatar:1,
            createdAt:1,
            isPublished:1,
        }
    })

    const video = await Video.aggregate(pipeline)
    if(!video){
        throw new ApiError(400, "Error while fetching videos!")
    }

    return res.json(new ApiResponse(200, video, "Successfully fetched video"))

}) 

const publishAVideo = asyncHandler(async (req, res) => {
    // steps
    // 1. Get details from frontend
    const { title, description} = req.body

    // 2. Validate user input
    if([title, description].some(
        field => field.trim() ===""
    )){
        throw new ApiError(400, "All fields are required!")
    }
    
    // 3. check for thumbnail and video
    const thumbnailLocalPath = req?.files.thumbnail[0]?.path
    const videoFileLocalPath = req?.files.videoFile[0]?.path
    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is required!")
    }

    if(!videoFileLocalPath){
        throw new ApiError(400, "Video file is required!")
    }
    // 4: upload thumbnail to cloudinary, check if avatar uploaded to cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail){
        throw new ApiError(400, "Error while uploading thumbnail!")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    if(!videoFile){
        throw new ApiError(400, "Error while uploading video!")
    }
    // TODO: get video, upload to cloudinary, create video

    const video = await Video.create({
        title,
        description,
        thumbnail:thumbnail.secure_url,
        videoFile:videoFile.playback_url,
        duration:videoFile.duration,
        owner:req.user._id
    })

    if(!video){
        throw new ApiError(500, "Something went wrong while uploading video")
    }

    return res.json(new ApiResponse(200, video,"video uploaded"))
    
})

// TODO 1: the first lookup is searching for all the users with given videId, but i no that there is only one 
// user for one videoId, so modify to seacrch and return only one user instead of array with 
// one user  eg current outup data:[{...}], we want only data:{...}
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    // //TODO 2: add isubscribed field for current user
    // let currentUserId;
    // if(req.user){
    //     currentUserId = req.user._id
    // }

    const video = await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",

                // return only neccessary fields from User Model. returned fields will add into owner's fields
                pipeline:[
                    {
                        $lookup:{
                            from:"subscriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as:"subscribers"
                        }
                    },
                    {
                        $addFields:{
                            subscribersCount: {
                                $size: "$subscribers",
                            },
                        }
                    }
                ]
            }
        },
        {
            $unwind:"$owner"
        },
        {
            $addFields:{
                fullName:"$owner.fullName",
                avatar:"$owner.avatar",
                subscribersCount:"$owner.subscribersCount",
            }
        },
        {
            $project:{
                videoFile:1,
                thumbnail:1,
                title:1,
                description:1,
                duration:1,
                views:1,
                fullName:1,
                avatar:1,
                subscribersCount:1,
                createdAt:1,
                // likes,
                // dislikes,
                // isSubscribed:1
                
            }
        }
    ])

    if(!video){
        throw new ApiError(404, "Unable to fetch video!")
    }
    const videoData = video[0]
    // Aggregation querry to add required field eg channel icon and name
    

    return res.status(200).json(new ApiResponse(200,videoData,"Video fetched successfully!"))
})

export  {getVideoById, publishAVideo, getAllVideos}