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

async function run() {
    try {
        const github_token = core.getInput('GITHUB_TOKEN');
        const octokit = github.getOctokit(github_token);
        const context = github.context;

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

        // Your message
        const message = "|---|---|---|\n" +
            "| [lib/src/cbor/cbor\\_reader/cbor\\_reader\\_collections.c](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup#diff-bGliL3NyYy9jYm9yL2Nib3JfcmVhZGVyL2Nib3JfcmVhZGVyX2NvbGxlY3Rpb25zLmM=) | 87.50% | [1 Missing :warning: ](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup) |\n" +
            "| [lib/src/cbor/cbor\\_reader/cbor\\_reader\\_numeric.c](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup#diff-bGliL3NyYy9jYm9yL2Nib3JfcmVhZGVyL2Nib3JfcmVhZGVyX251bWVyaWMuYw==) | 0.00% | [1 Missing :warning: ](https://app.codecov.io/gh/Biglup/cardano-c/pull/23?src=pr&el=tree&utm_medium=referral&utm_source=github&utm_content=comment&utm_campaign=pr+comments&utm_term=Biglup) |"


        await octokit.rest.issues.createComment({
            ...context.repo,
            issue_number: pullRequestNumber,
            body: message
        });

    } catch (error) {
        core.setFailed(error.message);
    }
}

run().catch();