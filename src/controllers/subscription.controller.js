import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleSubscription = asyncHandler( async (req,res) => {
    const {channelId} = req.params
    const userId = req.user._id

    const user = User.findById(channelId)
    if(!user){
        throw new ApiError(404, "Channel not found!")
    }

    const subscribed = await Subscription.findOne({
        channel:channelId,
        subscriber:userId
    })

    // unsubscribe user
    if(subscribed){
        try {
            await Subscription.findByIdAndDelete(subscribed._id)
            return res.status(200).json(new ApiResponse(200, {}, "Channel unsubscribed successfully!"))
        } catch (error) {
            throw new ApiError(500, "Something went wrong while unsubscribing channel!")
        }
    }
    const subscription = await Subscription.create({
        channel:channelId,
        subscriber:userId
    })
    if(!subscription){
        throw new ApiError(500, "Something went wrong while subscribing channel!")
    }
    return res.status(200).json(new ApiResponse(200, {subscription}, "Channel subscribed successfully!"))
})



export {toggleSubscription}