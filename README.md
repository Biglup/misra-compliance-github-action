# MISRA C Compliance Report GitHub Action

This GitHub Action generates MISRA compliance reports, offering a structured Guideline Compliance Summary for projects adhering to MISRA C standards. It's designed to parse the output from static code analysis tools and produce a comprehensive report detailing compliance with MISRA C 2012 guidelines.

> \[!IMPORTANT\]
> This action is experimental and under development. It is currently tailored to work with Cppcheck and the MISRA C 2012 ruleset. Please use this action for testing and development purposes only and not in production environments.

## Inputs

### `GITHUB_TOKEN`

**Required** GitHub token for authentication. This is necessary for the action to access repository information and create check runs.

### `parser`

**Required** Specifies the analysis tool output parser to use.  
**Default:** `Cppcheck`  
**Options:** `[Cppcheck, PC-lint]`

### `results`

**Required** Path to the analysis tool's results.

### `rules`

**Required** Path to the file containing the list of MISRA rules.

### `suppressions`

**Required** Path to the file containing the list of suppressions.

## Runs

This action runs on Node.js 20 and executes the `dist/index.js` script as its main entry point.

## Example Usage

This example demonstrates how to configure the MISRA C Compliance Report GitHub Action in your workflow to generate a compliance report based on the results from Cppcheck.

```yaml
- name: Generate MISRA Compliance Report
  if: always()
  id: misra-compliance-report
  uses: Biglup/misra-compliance-github-action@v0.1
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    parser: 'Cppcheck'
    results: './scripts/misra/.results/results'
    rules: './scripts/misra/misra2012'
    suppressions: './scripts/misra/suppressions'
