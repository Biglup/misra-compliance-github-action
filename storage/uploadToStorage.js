import {Storage} from '@google-cloud/storage';
import crypto from 'crypto';
import fs from 'fs';

const BASE_URL = 'https://storage.googleapis.com/misra-c/'; // TODO: Remove hardcoded URL.

// Creates a client
const storage = new Storage();

function computeFileHash(filename) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filename);

        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

export async function uploadFile(bucketName, filename, destination) {
    const hash = await computeFileHash(filename);
    console.log(`File hash: ${hash}`);

    await storage.bucket(bucketName).upload(filename, {
        destination: destination,
        metadata: {
            contentType: 'application/pdf'
        },
    });

    console.log(`${filename} uploaded to ${bucketName}/${destination}`);

    return BASE_URL + destination;
}