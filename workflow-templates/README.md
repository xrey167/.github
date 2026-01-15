# Agenda Code Review Workflow

A comprehensive GitHub Actions workflow that implements best practices for code reviews. This workflow automates and enhances the code review process to maintain high code quality and improve team collaboration.

## Features

### 1. **PR Checklist Validation**
- Validates that pull requests have adequate descriptions (minimum 50 characters)
- Checks for recommended PR template sections
- Ensures PRs provide context for reviewers

### 2. **Automatic Reviewer Assignment**
- Auto-assigns appropriate reviewers based on code ownership
- Adds size labels based on PR changes (XS, S, M, L, XL)
- Applies initial status labels (`needs-review`)

### 3. **Review Quality Checks**
- Monitors review submissions for quality
- Updates labels based on review status (`approved`, `changes-requested`)
- Encourages detailed feedback from reviewers

### 4. **Review Reminders & Guidelines**
- Posts comprehensive review checklist on PR creation
- Provides structured agenda for reviewers covering:
  - Functionality verification
  - Code quality assessment
  - Testing coverage
  - Documentation review
  - Security and performance considerations

### 5. **Review Metrics Tracking**
- Calculates time from PR creation to first review
- Alerts if reviews take longer than expected (>72 hours)
- Helps teams maintain development velocity

### 6. **Changes Requested Follow-up**
- Automatically updates labels when changes are pushed
- Notifies reviewers when PR is ready for re-review
- Tracks the feedback loop

### 7. **Merge Readiness Assessment**
- Evaluates if PR meets merge criteria:
  - Has approval(s)
  - No outstanding change requests
  - All checks passing
  - Not in draft status
- Adds `ready-to-merge` label when all conditions are met

## Installation

### For Organization .github Repository

1. Copy `agenda-code-review.yml` to your `.github` repository under `workflow-templates/`
2. Copy `agenda-code-review.properties.json` to the same directory
3. The workflow template will appear in the Actions tab for all repositories in your organization

### For Individual Repository

1. Copy `agenda-code-review.yml` to `.github/workflows/` in your repository
2. Commit and push the file
3. The workflow will activate automatically on the next PR

## Configuration

The workflow works out of the box with sensible defaults. You can customize it by modifying:

### Size Labels
Adjust the thresholds in the `assign-reviewers` job:
```yaml
let sizeLabel = 'size/XS';
if (totalChanges > 500) sizeLabel = 'size/XL';      # Extra large PRs
else if (totalChanges > 250) sizeLabel = 'size/L';  # Large PRs
else if (totalChanges > 100) sizeLabel = 'size/M';  # Medium PRs
else if (totalChanges > 30) sizeLabel = 'size/S';   # Small PRs
```

### Review Time Expectations
Modify the threshold in the `review-metrics` job:
```yaml
if (reviewTimeHours > 72) {  # Change 72 to your preferred hours
```

### Required PR Sections
Update the `pr-checklist` job to match your PR template:
```yaml
const requiredSections = [
  '## Description',
  '## Type of Change',
  '## Testing'
];
```

### Review Checklist
Customize the review guidelines in the `review-reminder` job to match your team's priorities.

## Labels Used

The workflow automatically manages these labels:

| Label | Purpose |
|-------|---------|
| `needs-review` | PR is waiting for review |
| `approved` | PR has been approved |
| `changes-requested` | Changes have been requested |
| `ready-to-merge` | PR meets all merge criteria |
| `size/XS` | Less than 30 lines changed |
| `size/S` | 30-100 lines changed |
| `size/M` | 100-250 lines changed |
| `size/L` | 250-500 lines changed |
| `size/XL` | More than 500 lines changed |

**Note**: These labels will be created automatically when first used. You can also create them manually with custom colors:

```bash
# Create labels via GitHub CLI
gh label create "needs-review" --color "fbca04" --description "Awaiting review"
gh label create "approved" --color "0e8a16" --description "PR approved"
gh label create "changes-requested" --color "d93f0b" --description "Changes requested"
gh label create "ready-to-merge" --color "0e8a16" --description "Ready to be merged"
gh label create "size/XS" --color "c2e0c6" --description "Extra small PR"
gh label create "size/S" --color "c2e0c6" --description "Small PR"
gh label create "size/M" --color "fbca04" --description "Medium PR"
gh label create "size/L" --color "ee9400" --description "Large PR"
gh label create "size/XL" --color "d93f0b" --description "Extra large PR"
```

## Permissions

The workflow requires these permissions:
```yaml
permissions:
  pull-requests: write  # To add labels and comments
  issues: write         # To manage labels
  contents: read        # To read repository contents
```

## Best Practices Implemented

### For PR Authors
- Write clear, detailed PR descriptions
- Keep PRs focused and reasonably sized
- Respond to review comments promptly
- Push updates when changes are requested

### For Reviewers
- Review PRs within 24-48 hours
- Provide constructive, specific feedback
- Use the review checklist as a guide
- Approve with comments explaining what works well
- Be thorough but respectful

### For Teams
- Maintain consistent review standards
- Track review metrics to improve velocity
- Use size labels to prioritize reviews
- Follow the structured review agenda

## Workflow Triggers

The workflow runs on these events:

```yaml
on:
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review]
  pull_request_review:
    types: [submitted]
  issue_comment:
    types: [created]
```

## Troubleshooting

### Labels Not Being Applied
- Ensure the workflow has `pull-requests: write` permission
- Check that the workflow file is in the correct directory
- Verify the workflow is enabled in repository settings

### Reviews Not Triggering Updates
- Confirm reviewers are using GitHub's review feature (not just comments)
- Check the Actions tab for any workflow errors
- Ensure the workflow has necessary permissions

### Merge Readiness Not Updating
- Verify all required status checks are configured
- Check that branch protection rules are properly set
- Ensure the PR is not in draft mode

## Contributing

To improve this workflow template:

1. Test changes in a dedicated repository first
2. Document any new features in this README
3. Update the properties.json if categories or description change
4. Ensure the workflow remains general-purpose and configurable

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Pull Request Reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests)
- [Code Review Best Practices](https://google.github.io/eng-practices/review/)
- [GitHub Script Action](https://github.com/actions/github-script)

## License

This workflow template is provided as-is for use in any repository. Customize it to fit your team's needs.

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-15  
**Maintained by**: Repository Team
