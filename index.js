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

const parseViolations = (parseFunction, filePath) => {
    parseFunction(filePath).then(async (violations) => {
        const github_token = core.getInput('GITHUB_TOKEN');
        const octokit = github.getOctokit(github_token);
        const context = github.context;


        // Your message
        const message = "\<\!-- MISRA C REPORT --\>\n" +
            "\# MISRA C report \n\n" +
            "|X|Z|Y|\n" +
            "|---|---|---|\n" +
            "| [lib/src/cbor/cbor\\_reader/cbor\\_reader\\_collections.c](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup#diff-bGliL3NyYy9jYm9yL2Nib3JfcmVhZGVyL2Nib3JfcmVhZGVyX2NvbGxlY3Rpb25zLmM=) | 87.50% | [1 Missing :warning: ](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup) |\n" +
            "| [lib/src/cbor/cbor\\_reader/cbor\\_reader\\_numeric.c](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup#diff-bGliL3NyYy9jYm9yL2Nib3JfcmVhZGVyL2Nib3JfcmVhZGVyX251bWVyaWMuYw==) | 0.00% | [1 Missing :warning: ](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup) |"

        await updateMISRAComment(octokit, context, message);
    }).catch(error => {
        core.setFailed(error.message);
    });
};

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