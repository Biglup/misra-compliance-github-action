import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';
import { promises as fsPromises } from 'fs';

const BASE_URL = 'https://storage.googleapis.com/misra-c/';

const storage = new Storage();

async function computeFileHashFromBuffer(buffer) {
    const hash = crypto.createHash('md5');
    hash.update(buffer);
    return hash.digest('hex');
}

async function readFileIntoBuffer(filename) {
    return fsPromises.readFile(filename);
}

export async function uploadFile(bucketName, filename, destination) {
    const buffer = await readFileIntoBuffer(filename);
    const hash = await computeFileHashFromBuffer(buffer);
    console.log(`File hash: ${hash}`);

    try {
        await storage.bucket(bucketName).file(destination).save(buffer, {
            metadata: {
                contentType: 'application/pdf',
            },
        });
        console.log(`Buffer uploaded to ${bucketName}/${destination}`);
    } catch (error) {
        console.error('Error uploading buffer:', error);
        throw error;
    }

    return BASE_URL + destination;
}