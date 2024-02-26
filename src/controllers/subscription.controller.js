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

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    const subscribers = await Subscription.aggregate([
        {   
            // filter all subscribers for channelId
            $match:{
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscribers",
                pipeline:[
                    {
                        $lookup:{
                            from:"subscriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as:"channelsSuscribedByUsers"
                        }
                    },
                    {
                        $addFields:{
                            subscribersCount:{
                                $size:"$channelsSuscribedByUsers"
                            },
                            isSubscribed:{
                                $cond:{
                                    if:{$in: [req.user._id, "$channelsSuscribedByUsers.subscriber"]},
                                    then:true,
                                    else:false
                                }
                            }
                        }
                    },
                ]
            }
        },
        {
            $unwind:"$subscribers"
        },
        {
            $project:{
                "subscribers.fullName":1,
                "subscribers.avatar":1,
                "subscribers.subscribersCount":1,
                "subscribers.isSubscribed":1,
            }
        }
    ])
    // const sub = Subscription.find({channel:channelId})
    if (!subscribers){
        throw new ApiError(404, "Subscribers not found!")
    }
    
    return res.status(200).json(new ApiResponse(200,subscribers,"Subscribers fetched successfully!"))
})

// // controller to return channel list to which user has subscribed
// const getSubscribedChannels = asyncHandler(async (req, res) => {
//     const { subscriberId } = req.params
//     const username = req.query.username
//     if(subscriberId.trim() === ""){
//         throw new ApiError(404, "SubscriberId required to fetch subscribers")
//     }
//     const user = await Subscription.aggregate([
//         {
//             $match:{
//                 subscriber: new mongoose.Types.ObjectId(subscriberId)
//             }
//         },
//         {
//             $lookup:{
//                 from:"users",
//                 localField:"channel",
//                 foreignField:"_id",
//                 as:"subscribers",
//                 pipeline:[
//                     {
//                         $lookup:{
//                             from:"subscriptions",
//                             localField:"_id",
//                             foreignField:"channel",
//                             as:"channelsSuscribedByUsers"
//                         }
//                     },
//                     {
//                         $addFields:{
//                             subscribersCount:{
//                                 $size:"$channelsSuscribedByUsers"
//                             },
//                             isSubscribed:{
//                                 $cond: {
//                                     if:{$in: [subscriberId, "$channelsSuscribedByUsers.subscriber"]},
//                                     then:true,
//                                     else:false
//                                 }
//                             }
//                         }
//                     }
//                 ]
//             }
//         },
//         {
//             $unwind:"$subscribers"
//         },
//         {
//             $project:{
//                 "subscribers.fullName":1,
//                 "subscribers.avatar":1,
//                 "subscribers.subscribersCount":1,
//                 "subscribers.isSubscribed":1,
//             }
//         }
//     ])

//     if (!user){
//         throw new ApiError(500, "Something went wrong while fetching subscribers")
//     }

//     return res.status(200).json(new ApiResponse(200, user,"Subscribers fetched successfully"))
// })

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    const fullName = req.query.fullName;

    if (subscriberId.trim() === "") {
        throw new ApiError(404, "SubscriberId required to fetch subscribers");
    }

    const pipeline = [
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribers",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "channelsSuscribedByUsers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$channelsSuscribedByUsers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [subscriberId, "$channelsSuscribedByUsers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscribers"
        },
        {
            $project: {
                "subscribers.fullName": 1,
                "subscribers.avatar": 1,
                "subscribers.subscribersCount": 1,
                "subscribers.isSubscribed": 1,
            }
        }
    ];

    if (fullName) {
        pipeline.push({
            $match: {
                "subscribers.fullName": {
                    $regex: new RegExp(fullName, "i") // Case-insensitive regex match
                }
            }
        });
    }

    const user = await Subscription.aggregate(pipeline);

    if (!user) {
        throw new ApiError(500, "Something went wrong while fetching subscribers");
    }

    return res.status(200).json(new ApiResponse(200, user, "Subscribers fetched successfully"));
});


export {toggleSubscription,getUserChannelSubscribers, getSubscribedChannels}