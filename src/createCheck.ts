import { getOctokit } from '@actions/github'
import { Context } from '@actions/github/lib/context'
type Octokit = ReturnType<typeof getOctokit>

interface DetailsCheck {
    conclusion:
        | 'success'
        | 'failure'
        | 'neutral'
        | 'cancelled'
        | 'skipped'
        | 'timed_out'
        | 'action_required'
        | undefined
    output: {
        title: string
        summary: string
    }
}
/*
 * create a check and return a function that updates(completes) it
 */
export async function createCheck(octokit: Octokit, context: Context) {
    const check = await octokit.rest.checks.create({
        ...context.repo,
        name: 'Compressed Size',
        head_sha: context.payload.pull_request!.head.sha,
        status: 'in_progress'
    })

    return async (details: DetailsCheck) => {
        await octokit.rest.checks.update({
            ...context.repo,
            check_run_id: check.data.id,
            completed_at: new Date().toISOString(),
            status: 'completed',
            ...details
        })
    }
}
