const validateFileType = function(file,cb){
    const allowedImageMimeTypes = ['image/jpeg', 'image/png']; // Allowed image types
    const allowedVideoMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime']; // Allowed video types
    const imageNames = ['thumbnail','coverImage','avatar']
    // Check if the file type is allowed
    if ( imageNames.includes(file.fieldname) && !allowedImageMimeTypes.includes(file.mimetype)) {
        const error = new Error('Invalid file type. Please upload an image file.');
        error.code = 'FILE_TYPE_NOT_SUPPORTED';
        return cb(error);
    }
  
    if (file.fieldname === 'videoFile' && !allowedVideoMimeTypes.includes(file.mimetype)) {
        const error = new Error('Invalid file type. Please upload a video file.');
        error.code = 'FILE_TYPE_NOT_SUPPORTED';
        return cb(error);
    }

    cb(null, true); // File is valid
}

export {validateFileType}