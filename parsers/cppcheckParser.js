import fs from 'fs';
import readline from 'readline';
import { RuleViolation } from './RuleViolation.js';

const removeAnsiColorCodes = (text) => text.replace(/\x1B\[[;?\d]*[A-HJKSTfimnrsu]/g, '');

export const cppcheckParser = async (filePath) => {
    const fileStream = fs.createReadStream(filePath);
    const lines = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const regex = /^(.+?):(\d+):\d+: (\w+): (.+) \[misra-c2012-(\d+\.\d+)\]$/;
    const violations = [];

    for await (const line of lines) {
        const cleanedLine = removeAnsiColorCodes(line);
        const match = regex.exec(cleanedLine);
        if (match) {
            const [_, file, lineNumber, category, rationale, directive] = match;
            violations.push(new RuleViolation(file, lineNumber, category, rationale, directive));
        }
    }

    return violations;
};
