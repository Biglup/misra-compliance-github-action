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

const parser = core.getInput('parser');
const filePathRules = core.getInput('rules');
const filePathSuppressions = core.getInput('suppressions');
const filePath = core.getInput('results');

async function run() {
    try {
        const rules = await parseRules(filePathRules);
        const suppressions = await parseSuppressions(filePathSuppressions);
        const results = await parsers[parser](filePath);

        console.log(filePath);
        console.log(results);

        const github_token = core.getInput('GITHUB_TOKEN');
        const octokit = github.getOctokit(github_token);
        const context = github.context;

        // Render rule violations

        let message = "\<\!-- MISRA C REPORT --\>\n";
        message += `| File | Line | Category | Rationale | Directive |\n`;
        message += `| --- | --- | --- | --- | --- |\n`;

        for (const result of results) {
            const rule = rules.find(rule => rule.directive === result.directive);
            if (rule && !suppressions.includes(rule.directive)) {
                message += `| ${result.file} | ${result.line} | ${rule.category} | ${result.rationale} | ${result.directive} |\n`;
            }
        }

        // render suppressions
        message += `\n\n### Suppressions\n\n`;
        message += `| Directive |\n`;
        message += `| --- |\n`;

        for (const suppression of suppressions) {
            message += `| ${suppression} |\n`;
        }

        await updateMISRAComment(octokit, context, message);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run().catch(core.setFailed);