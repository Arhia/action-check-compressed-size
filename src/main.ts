import { info, startGroup, endGroup, getInput, error, setFailed, debug } from '@actions/core'
import path from 'path'
import { context, getOctokit } from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'
import { exec } from '@actions/exec'
import SizePlugin from 'size-plugin-core'
import { fileExists, diffTable, toBool, stripHash } from './utils'
import { createCheck } from './createCheck'

type GithubClient = InstanceType<typeof GitHub>

type Args = {
    repoToken: string
    directory: string
}

async function run(): Promise<void> {
    try {
        const args = getAndValidateArgs()
        const octokit = getOctokit(args.repoToken)

        const { number: pull_number } = context.issue

        const pr = context.payload.pull_request

        if (!pr) {
            throw Error(
                'Could not retrieve PR information. Only "pull_request" triggered workflows are currently supported.'
            )
        }

        const plugin = new SizePlugin({
            compression: getInput('compression'),
            pattern: getInput('pattern') || '**/dist/**/*.js',
            exclude: getInput('exclude') || '{**/*.map,**/node_modules/**}',
            stripHash: stripHash(getInput('strip-hash'))
        })

        info(`PR #${pull_number} is targetted at ${pr.base.ref} (${pr.base.sha})`)

        const buildScript = getInput('build-script') || 'build'
        const workingDir = path.join(process.cwd(), args.directory)
        info(`Working directory : ${workingDir}`)

        const yarnLock = await fileExists(path.resolve(workingDir, 'yarn.lock'))
        const packageLock = await fileExists(path.resolve(workingDir, 'package-lock.json'))

        const execOptions = {
            ...(args.directory ? { cwd: args.directory } : {})
        }

        let npm = `npm`
        let installScript = `npm install`
        if (yarnLock) {
            installScript = npm = `yarn --frozen-lockfile`
        } else if (packageLock) {
            installScript = `npm ci`
        }

        startGroup(`[current branch] Install Dependencies`)
        info(`Installing using ${installScript}`)
        await exec(installScript, [], execOptions)
        endGroup()

        startGroup(`[current branch] Build using ${npm}`)
        info(`Building using ${npm} run ${buildScript}`)
        await exec(`${npm} run ${buildScript}`, [], execOptions)
        endGroup()

        const newSizes = await plugin.readFromDisk(workingDir)

        startGroup(`[base branch] Checkout target branch`)
        let baseRef
        try {
            baseRef = context.payload.base.ref
            if (!baseRef) throw Error('missing context.payload.pull_request.base.ref')
            await exec(`git fetch -n origin ${context.payload.pull_request!.base.ref}`)
            debug('successfully fetched base.ref')
        } catch (errFetchBaseRef) {
            debug(`fetching base.ref failed ${errFetchBaseRef.message}`)
            try {
                await exec(`git fetch -n origin ${pr.base.sha}`)
                debug('successfully fetched base.sha')
            } catch (errFetchBaseSha) {
                debug(`fetching base.sha failed ${errFetchBaseSha.message}`)
                try {
                    await exec(`git fetch -n`)
                } catch (errFetch) {
                    debug(`fetch failed ${errFetch.message}`)
                }
            }
        }

        debug('checking out and building base commit')
        try {
            if (!baseRef) throw Error('missing context.payload.base.ref')
            await exec(`git reset --hard ${baseRef}`)
        } catch (e) {
            await exec(`git reset --hard ${pr.base.sha}`)
        }
        endGroup()

        startGroup(`[base branch] Install Dependencies`)
        await exec(installScript, [], execOptions)
        endGroup()

        startGroup(`[base branch] Build using ${npm}`)
        await exec(`${npm} run ${buildScript}`, [], execOptions)
        endGroup()

        const oldSizes = await plugin.readFromDisk(workingDir)

        const diff = await plugin.getDiff(oldSizes, newSizes)

        startGroup(`Size Differences:`)
        const cliText = await plugin.printSizes(diff)
        info(cliText)
        endGroup()

        const markdownDiff = diffTable(diff, {
            collapseUnchanged: toBool(getInput('collapse-unchanged')),
            omitUnchanged: toBool(getInput('omit-unchanged')),
            showTotal: toBool(getInput('show-total')),
            minimumChangeThreshold: parseInt(getInput('minimum-change-threshold'), 10)
        })

        let outputRawMarkdown = false

        const commentInfo = {
            ...context.repo,
            issue_number: pull_number
        }

        const comment = {
            ...commentInfo,
            body:
                markdownDiff +
                '\n\n<a href="https://github.com/Arhia/action-check-compressed-size"><sub>Arhia/action-check-compressed-size</sub></a>'
        }

        if (toBool(getInput('use-check'))) {
            if (args.repoToken) {
                const finish = await createCheck(octokit, context)
                await finish({
                    conclusion: 'success',
                    output: {
                        title: `Compressed Size Action`,
                        summary: markdownDiff
                    }
                })
            } else {
                outputRawMarkdown = true
            }
        } else {
            startGroup(`Updating stats PR comment`)
            let commentId
            try {
                const comments = (await octokit.issues.listComments(commentInfo)).data
                for (let i = comments.length; i--; ) {
                    const c = comments[i]
                    if (c.user.type === 'Bot' && /<sub>[\s\n]*(compressed|gzip)-size-action/.test(c.body)) {
                        commentId = c.id
                        break
                    }
                }
            } catch (e) {
                debug(`Error checking for previous comments: ${e.message}`)
            }

            if (commentId) {
                debug(`Updating previous comment #${commentId}`)
                try {
                    await octokit.issues.updateComment({
                        ...context.repo,
                        comment_id: commentId,
                        body: comment.body
                    })
                } catch (e) {
                    debug(`Error editing previous comment: ${e.message}`)
                    commentId = null
                }
            }

            // no previous or edit failed
            if (!commentId) {
                debug('Creating new comment')
                try {
                    await octokit.issues.createComment(comment)
                } catch (e) {
                    debug(`Error creating comment: ${e.message}`)
                    debug(`Submitting a PR review comment instead...`)
                    try {
                        const issue = context.issue || pr
                        await octokit.pulls.createReview({
                            owner: issue.owner,
                            repo: issue.repo,
                            pull_number: issue.number,
                            event: 'COMMENT',
                            body: comment.body
                        })
                    } catch (errCreateComment) {
                        debug(`Error creating PR review ${errCreateComment.message}`)
                        outputRawMarkdown = true
                    }
                }
            }
            endGroup()
        }

        if (outputRawMarkdown) {
            error(
                `
			Error: compressed-size-action was unable to comment on your PR.
			This can happen for PR's originating from a fork without write permissions.
			You can copy the size table directly into a comment using the markdown below:
			\n\n${comment.body}\n\n
		`.replace(/^(\t| {2})+/gm, '')
            )
        }
    } catch (errorAction) {
        error(errorAction)
        setFailed(errorAction.message)
    }
}

function getAndValidateArgs(): Args {
    const args = {
        repoToken: getInput('repo-token', { required: true }),
        directory: getInput('directory')
    }

    return args
}

run()
