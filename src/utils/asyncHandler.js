// accepting requestHandler function and returning asyncHandler as a function (so thet other file can execute asyncHandler)
const asyncHandler = (requestHander) => {
    return (req,res,next) => {
        Promise.resolve(requestHander(req,res,next)).catch(err => next(err))
    }
}

export { asyncHandler }