import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Importing the Cloudinary library and configuring it with environment variables

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,  
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });
    
    const uploadOnCloudinary = async(localfilePath)=>{
        try {
            if (!localfilePath) return null;
            const result = await cloudinary.uploader.upload(localfilePath, {
                
                resource_type: 'auto'
            });
            // console.log('File uploaded to Cloudinary:', result);
            fs.unlinkSync(localfilePath); // Clean up the local file after upload
            return result;
        } catch (error) {
            fs.unlinkSync(localfilePath); // Clean up the local file if upload fails
            console.error('Error uploading to Cloudinary:', error);
            throw error;
        }
    }

    export { uploadOnCloudinary };
// This code uploads a file to Cloudinary and returns the URL of the uploaded file.