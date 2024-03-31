import {Storage} from '@google-cloud/storage';
import crypto from 'crypto';
import fs from 'fs';

const BASE_URL = 'https://storage.googleapis.com/misra-c/'; // TODO: Remove hardcoded URL.

// Creates a client
const storage = new Storage();

async function computeFileHashFromBuffer(buffer) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    hash.update(buffer);
    return hash.digest('hex');
}

async function readFileIntoBuffer(filename) {
    return fs.readFile(filename);
}

export async function uploadFile(bucketName, filename, destination) {
    const buffer = await readFileIntoBuffer(filename);
    const hash = await computeFileHashFromBuffer(buffer);

    console.log(`File hash: ${hash}`);

    await storage.bucket(bucketName).file(destination).save(buffer, {
        metadata: {
            contentType: 'application/pdf',
        },
    });

    console.log(`${filename} uploaded to ${bucketName}/${destination}`);

    return BASE_URL + destination;
}