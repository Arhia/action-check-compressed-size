import * as core from '@actions/core'
import * as github from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'
import * as micromatch from 'micromatch'
type GithubClient = InstanceType<typeof GitHub>
interface GithubIssue {
  body: string
  number: number
  active_lock_reason: string | null
  assignee: string | null
  assignees: string[]
  author_association: string
  closed_at: string | null
  created_at: string | null
  comments: number
  id: number
  title: string
  labels: string[]
}

type Args = {
  repoToken: string
  configPath: string
}

export type TriageBotConfig = {
  labels: {
    label: string
    glob: string
    comment?: string
    negate?: boolean
  }[]
  comment?: string
  no_label_comment?: string
}

async function run(): Promise<void> {
  try {
    const args = getAndValidateArgs()
    core.info('Starting GitHub Client')
    const client = github.getOctokit(args.repoToken)

    const issue = (github.context.payload.issue as unknown) as GithubIssue
    if (!issue) {
      core.error('No issue context found. This action can only run on issue creation.')
      return
    }
    core.debug(`Issue body content from context : \n ${issue.body}`)

    core.info(`Loading config file at ${args.configPath}`)
    const config = await getConfig(client, args.configPath)

    const { matchingLabels, comments } = processIssue({ config, issue })

    if (matchingLabels.length > 0) {
      core.info(`Adding labels ${matchingLabels.join(', ')} to issue #${issue.number}`)

      await addLabels(client, issue.number, matchingLabels)

      if (comments.length) {
        await writeComment(client, issue.number, comments.join('\n\n'))
      }
    } else if (config.no_label_comment) {
      core.info(`Adding comment to issue #${issue.number}, because no labels match`)

      await writeComment(client, issue.number, config.no_label_comment)
    }
  } catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

export function processIssue({
  config,
  issue
}: {
  config: TriageBotConfig
  issue: { body: string }
}): {
  matchingLabels: string[]
  comments: string[]
} {
  const matchingLabels: string[] = []
  const comments: string[] = config.comment ? [config.comment] : []

  const lines = issue.body.split(/\r?\n|\r/g)

  for (const label of config.labels) {
    const isNegated = label.negate === true
    let isMatching: boolean
    if (isNegated) {
      // si on negate le patern, aucune ligne ne doit contenir le pattern
      isMatching = !lines.some(l => micromatch.isMatch(l, label.glob))
    } else {
      // pattern normal, au mois 1 ligne doit contenir le pattern
      isMatching = lines.some(l => micromatch.isMatch(l, label.glob))
    }

    if (isMatching) {
      core.debug(`Match in body for pattern ${label.glob}`)
      matchingLabels.push(label.label)
      if (label.comment) {
        comments.push(label.comment)
      }
    } else {
      core.debug(`No match in body for pattern ${label.glob}`)
    }
  }
  return {
    matchingLabels,
    comments
  }
}

async function writeComment(client: GithubClient, issueId: number, body: string): Promise<void> {
  await client.issues.createComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: issueId,
    body
  })
}

async function addLabels(client: GithubClient, issueId: number, labels: string[]): Promise<void> {
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: issueId,
    labels
  })
}

async function getConfig(client: GithubClient, configPath: string): Promise<TriageBotConfig> {
  const response = await client.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: configPath,
    ref: github.context.sha
  })

  return JSON.parse(Buffer.from(response.data.content, 'base64').toString())
}

function getAndValidateArgs(): Args {
  const args = {
    repoToken: core.getInput('repo-token', { required: true }),
    configPath: core.getInput('config-path', { required: true })
  }

  return args
}

run()
