import fs from 'fs';
import readline from 'readline';
import core from '@actions/core';
import * as github from '@actions/github';
import { cppcheckParser } from './parsers/cppcheckParser.js';
import { pcLintParser } from './parsers/pclintParser.js';
import { parseRules } from './rules/parseRules.js';
import { parseSuppressions } from './rules/parseSuppressions.js';
import { generatePdfReport } from './pdf/generate-pdf-report.js';
import { uploadFile } from "./storage/uploadToStorage.js";

const parsers = {
    'Cppcheck': cppcheckParser,
    'PC-lint': pcLintParser
};

async function updateMISRAComment(octokit, context, newCommentBody) {
    const { owner, repo } = context.repo;

    const pullRequestNumber = context.payload.pull_request.number;

    // Fetch all comments on the pull request
    const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullRequestNumber,
    });

    // Find the comment with the hidden tag
    const existingComment = comments.find(comment => comment.body.includes('<!-- MISRA C REPORT -->'));

    if (existingComment) {
        // Update the existing comment
        await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: existingComment.id,
            body: newCommentBody,
        });
        console.log('Updated the existing MISRA C report comment.');
    } else {
        // Create a new comment if no existing comment was found
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: pullRequestNumber,
            body: newCommentBody,
        });
        console.log('Created a new MISRA C report comment.');
    }
}

function constructFileUrl(filePath, lineNumber, githubContext) {
    const owner = githubContext.payload.repository.owner.login;
    const repo = githubContext.payload.repository.name;

    // Initialize with commit SHA; it's always available and serves as a good fallback
    let ref = process.env.GITHUB_SHA;

    // If in the context of a pull request, prefer using the PR's branch name
    if (githubContext.eventName === 'pull_request' && githubContext.payload.pull_request) {
        ref = githubContext.payload.pull_request.head.ref;
    }

    const basePath = process.env.GITHUB_WORKSPACE;
    // Ensure filePath is relative to the repository root
    const relativePath = filePath.startsWith(basePath) ? filePath.substring(basePath.length + 1) : filePath;

    return `https://github.com/${owner}/${repo}/blob/${ref}/${relativePath}#L${lineNumber}`;
}

function getCurrentDateFormatted() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
}

const parser = core.getInput('parser');
const filePathRules = core.getInput('rules');
const filePathSuppressions = core.getInput('suppressions');
const resultPath = core.getInput('results');
const project = core.getInput('project');
const filesPath = core.getInput('files');
const outputFile = '/tmp/report.pdf';

const toComplianceTable = (rules, results, suppresions) => {
    return rules.map(rule => {
        const compliant = !results.find(result => result.directive() === rule.directive());
        const isSuppressed = suppresions.includes(rule.directive());
        return {
            directive: 'Directive ' + rule.directive(),
            category: rule.category(),
            recategorization: '', // TODO: Implement recategorization
            compliance: isSuppressed ? 'DEVIATION': (compliant ? 'COMPLIANT' : 'NON-COMPLIANT')
        };
    });
}

async function parseFileList(fileList) {
    const fileStream = fs.createReadStream(fileList);
    const lines = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const parsedFiles = []; // Initialize an empty array to store the results

    // Await the processing of each line
    for await (const line of lines) {
        const [moduleName, path] = line.split('::');
        const relativePath = path.replace(process.env.GITHUB_WORKSPACE, '');
        parsedFiles.push(relativePath); // Add the processed line to the array
    }

    return parsedFiles;
}

async function uploadReportToGoogleCloud(hash) {
    // Example usage
    const bucketName = 'misra-c'; // TODO: Hardcoded for now. Make this an input?
    const destination = `MISRA_c_compliance_report_${hash}.pdf`;

    return uploadFile(bucketName, outputFile, destination);
}

async function run() {
    try {
        const rules = await parseRules(filePathRules);
        const suppressions = await parseSuppressions(filePathSuppressions);
        const results = await parsers[parser](resultPath);
        const files = await parseFileList(filesPath);
        const complianceTable = toComplianceTable(rules, results, suppressions);

        const violationsByCategory = complianceTable.reduce((acc, result) => {
            if (acc[result.category]) {
                if (result.compliance !== 'NON-COMPLIANT') return acc;
                acc[result.category]++;
            } else {
                acc[result.category] = 0;

                if (result.compliance === 'NON-COMPLIANT')
                    acc[result.category]++;

                return acc;
            }

            return acc;
        }, {});

        const deviationsByCategory = complianceTable.reduce((acc, result) => {
            if (acc[result.category]) {
                if (result.compliance !== 'DEVIATION') return acc;
                acc[result.category]++;
            } else {
                acc[result.category] = 0;

                if (result.compliance === 'DEVIATION')
                    acc[result.category]++;

                return acc;
            }

            return acc;
        }, {});

        await generatePdfReport({
            rules: complianceTable,
            files,
            project,
            commit: process.env.GITHUB_SHA,
            date: getCurrentDateFormatted(),
            guidelines: 'MISRA C 2012', // TODO: make this configurable
            checkingTool: parser,
            compliance: results.length > 0 ? 'Non-Compliant' : 'Compliant',
            outputFile,
            violationsByCategory,
            deviationsByCategory
        });

        const github_token = core.getInput('GITHUB_TOKEN');
        const octokit = github.getOctokit(github_token);
        const context = github.context;

        let message = "\<\!-- MISRA C REPORT --\>\n";

        message += '\n';
        message += '<p align="left">\n';
        message += '   <img src="https://storage.googleapis.com/biglup/misra_c.svg" width="100" alt="MISRA C Logo">\n';
        message += '</p>\n';

        message += '\n';
        message += '# MISRA Guideline Compliance Summary\n';

        message += '\n';
        message += '<table border="0">\n';
        message += '    <tr>\n';
        message += '        <td><b>Commit:</b></td>\n';
        message += `        <td><code>${process.env.GITHUB_SHA}</code></td>\n`;
        message += '    </tr>\n';
        message += '    <tr>\n';
        message += '        <td><b>Date:</b></td>\n';
        message += `        <td>${getCurrentDateFormatted()}</td>\n`;
        message += '    </tr>\n';
        message += '    <tr>\n';
        message += '        <td><b>Guidelines:</b></td>\n';
        message += '        <td>MISRA C 2012</td>\n'; // TODO: make this configurable
        message += '    </tr>\n';
        message += '    <tr>\n';
        message += '        <td><b>Checking Tool:</b></td>\n';
        message += `        <td>${parser}</td>\n`;
        message += '    </tr>\n';
        message += '    <tr>\n';
        message += '        <td><b>Result:</b></td>\n';
        message += results.length > 0 ? '        <td>Non-Compliant ❌</td>\n' :  '        <td>Compliant ✅</td>\n';
        message += '    </tr>\n';
        message += '</table>\n';

        if (results.length === 0) {
            message += '\n';

            const uploadedReport = await uploadReportToGoogleCloud(process.env.GITHUB_SHA);
            message += '## 🎉 No MISRA C 2012 Violations Found!\n';
            message += `You can download the complete report from: [MISRA C Report](${uploadedReport})\n`;

            await updateMISRAComment(octokit, context, message);
            return;
        }

        message += '\n';
        message += '## MISRA C 2012 Violation Summary\n';
        message += '<table>\n';
        message += '    <tr>\n';
        message += '        <th>Category</th>\n';
        message += '        <th>Violations</th>\n';
        message += '    </tr>\n';

        const ruleViolations = results.reduce((acc, result) => {
            if (acc[result.category]) {
                acc[result.category]++;
            } else {
                acc[result.category] = 1;
                return acc;
            }
            return acc;
        }, {});

        for (const [category, count] of Object.entries(ruleViolations)) {
            message += '    <tr>\n';
            message += `        <td>${category}</td>\n`;
            message += `        <td>${count}</td>\n`;
            message += '    </tr>\n';
        }
        message += '</table><br/>\n';

        message += '<details>\n';
        message += `    <summary>Click here to toggle the visibility of the <b>${results.length}</b> violations</summary>\n`;

        message += `\n`;
        message += `| File | Directive | Category | Rationale |\n`;
        message += `| --- | --- | --- | --- |\n`;

        for (const result of results) {
            const rule = rules.find(rule => rule.directive() === result.directive());
            if (rule && !suppressions.includes(rule.directive())) {
                const fileUrl = constructFileUrl(result.file(), result.lineNumber(), github.context);
                const fileName = result.file().split('/').pop();
                const markdownLink = `[${fileName}:${result.lineNumber()}](${fileUrl})`;

                message += `| ${markdownLink} | ${result.directive()} | ${rule.category()} | ${result.rationale()} |\n`;
            }
        }
        message += `</details>\n`;

        const uploadedReport = await uploadReportToGoogleCloud(process.env.GITHUB_SHA);
        message += `\n`;
        message += `You can download the complete report from: [MISRA C Report](${uploadedReport})\n`;

        await updateMISRAComment(octokit, context, message);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run().catch(core.setFailed);