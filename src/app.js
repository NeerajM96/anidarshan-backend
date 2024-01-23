import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// configurations
// for data coming in form of json
app.use(express.json({limit: "16kb"}))

// for data coming from url eg. %20 used for empty space in URL and we need to tell our server what this %20 means etc.
app.use(express.urlencoded({extended: true, limit: "16kb"}))

// In case we need to some some static data like images on our server
app.use(express.static("public"))

// to perform crud operations on cookies stored on client's browser as only server can read and remove client's cookies from their browser
app.use(cookieParser())

// import Routes
import userRouter from "./routes/user.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"

// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)

export { app }