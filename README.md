# Triage Action

Automatically label and comment to an issue.

### Usage

See [action.yml](./action.yml) For comprehensive list of options.
 
Basic:

```yaml
name: "Triage Issue"
on:
  issues:
    types: [opened]

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
    - uses: Arhia/action-triaging@main
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
```

#### Configuration

Place the config file in `.github/triage_bot_config.json`

*Note: Multiple comments get concatenated into one comment*

Example Config:

```jsonc
{
  "labels": [
    {
      "label": ":raising_hand_woman: Feature", // Label to be used
      "glob": "*# Feature*",
    },
    {
      "label": ":bug: Bug",
      "glob":"*# Bug*",
      "comment": "Thank you for creating a bug report, if you haven't already please ensure you have provided context on the bug and a minimal repo where we can reproduce the issue." // Comment on an issue with this label
    },
    {
      "label": ":warning:Status: invalid (issue template not used)",
      "glob": "*GENERATED_BY_TEMPLATE*",
      "negate": true,
      "comment": "Please pick a template when clicking on 'New Issue' "
        }
  ],
  "comment": "Thank you for issue, please ensure no duplicate issues already exist and have a look at our docs site if you haven't already.", // Comment on any new issue that just got labelled
  "no_label_comment": "We could not automatically detect a matching label for this issue, please use the provided issue templates."  // Comment on an issue if the bot could not auto-detect a label for it
}
```