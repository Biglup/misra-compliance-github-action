const core = require('@actions/core');
const github = require('@actions/github');

try {
    // `who-to-greet` input defined in action metadata file
    const nameToGreet = core.getInput('who-to-greet');
    console.log(`Hello ${nameToGreet}!`);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);
} catch (error) {
    core.setFailed(error.message);
}

async function updateMISRAComment(octokit, context, newCommentBody) {
    const { owner, repo } = context.repo;
    const issue_number = context.issue.number; // Pull request number is the same as issue number

    // Fetch all comments on the pull request
    const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number,
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
            issue_number,
            body: newCommentBody,
        });
        console.log('Created a new MISRA C report comment.');
    }
}

async function run() {
    try {
        const github_token = core.getInput('GITHUB_TOKEN');
        const octokit = github.getOctokit(github_token);
        const context = github.context;

        // Your message
        const message = "\<\!-- MISRA C REPORT --\>\n" +
            "\# MISRA C report \n\n" +
            "|A|B|C|\n" +
            "|---|---|---|\n" +
            "| [lib/src/cbor/cbor\\_reader/cbor\\_reader\\_collections.c](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup#diff-bGliL3NyYy9jYm9yL2Nib3JfcmVhZGVyL2Nib3JfcmVhZGVyX2NvbGxlY3Rpb25zLmM=) | 87.50% | [1 Missing :warning: ](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup) |\n" +
            "| [lib/src/cbor/cbor\\_reader/cbor\\_reader\\_numeric.c](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup#diff-bGliL3NyYy9jYm9yL2Nib3JfcmVhZGVyL2Nib3JfcmVhZGVyX251bWVyaWMuYw==) | 0.00% | [1 Missing :warning: ](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup) |"


        await updateMISRAComment(octokit, context, message);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run().catch(core.setFailed);