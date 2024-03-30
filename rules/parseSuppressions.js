import fs from 'fs';
import readline from 'readline';

export async function parseSuppressions(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const lines = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const directives = [];

    for await (const line of lines) {
        // Skip empty lines and comments
        if (!line.trim() || line.startsWith('#')) continue;

        // Extract the directive number from the suppression line
        const match = line.match(/misra-c2012-(\d+\.\d+)/);
        if (match) {
            directives.push(match[1]); // Add the directive number to the array
        }
    }

    return directives;
}
