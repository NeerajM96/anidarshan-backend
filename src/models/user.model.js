import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
        username:{
            type: String,
            require: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true // helps in optmized searching
        },
        email:{
            type: String,
            require: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName:{
            type: String,
            require: true,
            lowercase: true,
            trim: true,
            index: true
        },
        avatar:{
            type: String, // cloudinary url
            require: true,
        },
        coverImage:{
            type: String, // cloudinary url
        },
        watchHistory:[
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            require: [true, "Password is required!"]
        },
        refreshToken:{
            type: String
        }
    },
    {
        timestamps: true
    }
)

// encrypts password just before saving to DB
userSchema.pre("save", async function(next){
    if (!this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

// used function(){} instead of arrow functions because we need references eg this.password, this.username
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this.id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this.id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User",userSchema)