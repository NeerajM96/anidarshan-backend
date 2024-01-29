import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js";


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Unable to fetch video!")
    }

    return res.status(200).json(new ApiResponse(200,video,"User fetched successfully!"))
})

export  {getVideoById}