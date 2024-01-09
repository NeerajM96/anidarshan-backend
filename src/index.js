// dotenv has always be the first to import as it is needed right away
import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
    path: "./env"
})

const PORT = process.env.PORT || 8000

// async-await(used in db connection file) returns a promise
connectDB()
.then(
    app.listen(PORT, ()=>{
        console.log(`Server is running at port: ${PORT}`)
    })
)
.catch(error=>{
    console.log("MongoDB Connection Failed !!! ",error)
})