import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createTweet = asyncHandler( async (req,res) =>{
    const content = req.body.content
    const owner = req.user._id
    if (content.trim() === ""){
        throw new ApiError(400, "Content is required")
    }

    const tweet = await Tweet.create({
        owner,
        content
    })

    if (!tweet){
        throw new ApiError(500, "Something went wrong while creating the tweet!")
    }

    return res.status(201).json( new ApiResponse(200, tweet) )
})


export {createTweet}