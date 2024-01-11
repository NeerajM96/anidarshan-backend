import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String,       //cloudinary url
            require: true
        },
        thumbnail: {
            type: String,       //cloudinary url
            require: true
        },
        title: {
            type: String,    
            require: true
        },
        description: {
            type: String,    
            require: true
        },
        duration: {
            type: Number,    
            require: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)

// paginatoor gives us the ability to control pagination of videos eg. in one page from which vieo to which video we need to return
videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)