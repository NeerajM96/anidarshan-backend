import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

// used async-await because fetching data from DB takes time
const connectDB = async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB Connected !!`)
        // console.log(`\n MongoDB Connected !! DB Host: ${connectionInstance.connection.host}`)
        
    } catch (error) {
        console.log("MONGODB Connection Failed: ",error)
        process.exit(1)
    }
}

export default connectDB