import {Rule} from './Rule.js';
import fs from 'fs';
import readline from 'readline';

export async function parseRules(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const lines = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const rules = [];
    let isHeaderPassed = false;
    let directiveLine = '';

    for await (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;

        // Check if we've passed the header
        if (!isHeaderPassed) {
            if (line.startsWith('Appendix A Summary of guidelines')) {
                isHeaderPassed = true;
            }
            continue;
        }

        // Process lines after the header
        if (!directiveLine) {
            directiveLine = line; // Capture the directive and category line
        } else {
            // Parse the directive and category from the directiveLine
            const [_, directive, category] = directiveLine.match(/^Rule (\d+\.\d+) (\w+)/) || [];

             // The current line is the rationale
            rules.push(new Rule(directive, category, line));

            directiveLine = ''; // Reset for the next rule
        }
    }

    return rules;
}
