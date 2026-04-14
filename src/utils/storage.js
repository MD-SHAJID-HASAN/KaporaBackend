import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
dotenv.config();

const s3 = new S3Client({
    endpoint: process.env.STORJ_ENDPOINT,
    region: process.env.STORJ_REGION, // ap1
    credentials: {
        accessKeyId: process.env.STORJ_ACCESS_KEY,
        secretAccessKey: process.env.STORJ_SECRET_KEY,
    },
    forcePathStyle: true,
});

export const uploadToStorj = async (file) => {
    const fileName = `${Date.now()}-${file.originalname}`;

    const params = {
        Bucket: process.env.STORJ_BUCKET_NAME,
        Key: `${fileName}`, // Organizing under the 'kapora' folder
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        await s3.send(new PutObjectCommand(params));

        // Instead of returning the Storj URL, we return the ImageKit path
        // This is what you will save in your Database (MongoDB)
        return {
            filePath: `/kapora/${fileName}`,
            ikUrl: `${process.env.IMAGEKIT_URL_ENDPOINT}kapora/${fileName}`
        };
    } catch (error) {
        console.error("Storj Upload Error:", error);
        throw error;
    }
};

export const deleteFromStorj = async (filePath) => {
    const params = {
        Bucket: process.env.STORJ_BUCKET_NAME,
        Key: filePath.startsWith('/') ? filePath.substring(1) : filePath, // Remove leading slash
    };
    try {
        await s3.send(new DeleteObjectCommand(params));
    } catch (error) {
        console.error("Storj Delete Error:", error);
    }
};