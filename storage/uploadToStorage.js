import {Storage} from '@google-cloud/storage';

const BASE_URL = 'https://storage.googleapis.com/misra-c/'; // TODO: Remove hardcoded URL.

// Creates a client
const storage = new Storage();

export async function uploadFile(bucketName, filename, destination) {
    await storage.bucket(bucketName).upload(filename, {
        destination: destination,
    });

    console.log(`${filename} uploaded to ${bucketName}/${destination}`);

    return BASE_URL + destination;
}