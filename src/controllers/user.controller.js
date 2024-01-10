import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler( async (req,res) => {
  res.status(200).json({
    message: "ok"
  })
})

// if we are exporting like below 'export {register}', then we have to use '{}' during importing it in other files
export {registerUser}