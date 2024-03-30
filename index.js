import core from '@actions/core';
import * as github from '@actions/github';
import { cppcheckParser } from './parsers/cppcheckParser.js';
import { pcLintParser } from './parsers/pclintParser.js';
import { parseRules } from './rules/parseRules.js';
import { parseSuppressions } from './rules/parseSuppressions.js';

const parsers = {
    'Cppcheck': cppcheckParser,
    'PC-lint': pcLintParser
};

async function updateMISRAComment(octokit, context, newCommentBody) {
    const { owner, repo } = context.repo;

    // Get branch name from ref
    const branchName = context.ref.replace('refs/heads/', '');

    // Find pull requests associated with the branch
    const { data: pullRequests } = await octokit.rest.pulls.list({
        ...context.repo,
        state: 'open',
        head: `${context.repo.owner}:${branchName}`
    });

    if (pullRequests.length === 0) {
        core.setFailed('No related pull request found.');
        return;
    }

    // Assuming you want to comment on the first related pull request
    const pullRequestNumber = pullRequests[0].number;

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
const filePath = core.getInput('results');

async function run() {
    try {
        const rules = await parseRules(filePathRules);
        const suppressions = await parseSuppressions(filePathSuppressions);
        const results = await parsers[parser](filePath);

        const github_token = core.getInput('GITHUB_TOKEN');
        const octokit = github.getOctokit(github_token);
        const context = github.context;

        let message = "\<\!-- MISRA C REPORT --\>\n";

        message += '<p align="left">\n';
        message += '   <img src="https://storage.googleapis.com/bunny-island/misra-c-logo.png" width="100" alt="MISRA C Logo">\n';
        message += '</p>\n';

        message += '# MISRA Guideline Compliance Summary\n';

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
            message += '## No MISRA C 2012 violations found. :tada:\n';
            await updateMISRAComment(octokit, context, message);
            return;
        }

        const violationsByCategory = results.reduce((acc, result) => {
            if (acc[result.category()]) {
                acc[result.category()]++;
            } else {
                acc[result.category()] = 1;
            }

            return acc;
        }, {});

        message += '## MISRA C 2012 Violation Summary\n';
        message += '<table border="1">\n';
        message += '    <tr>\n';
        message += '        <th>Category</th>\n';
        message += '        <th>Violations</th>\n';
        message += '    </tr>\n';

        for (const [category, count] of Object.entries(violationsByCategory)) {
            message += '    <tr>\n';
            message += `        <td>${category}</td>\n`;
            message += `        <td>${count}</td>\n`;
            message += '    </tr>\n';
        }

        message += '</table>\n';

        message += `## MISRA C 2012 Violations\n`;
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

        await updateMISRAComment(octokit, context, message);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run().catch(core.setFailed);