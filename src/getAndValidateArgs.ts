import { getInput } from '@actions/core'
import { toBool } from './utils'

type Args = {
    repoToken: string
    directory: string
    compression: string
    pattern: string
    exclude: string
    stripHashPattern: string[]
    minimumChangeThreshold: number
    showTotal: boolean
    omitUnchanged: boolean
    collapseUnchanged: boolean
}

export function getAndValidateArgs(): Args {
    const args = {
        repoToken: getInput('repo-token', { required: true }),
        directory: getInput('directory'),
        pattern: getInput('pattern') || '**/dist/**/*.js',
        exclude: getInput('exclude') || '{**/*.map,**/node_modules/**}',
        compression: getInput('compression'),
        stripHashPattern: getInput('strip-hash') ? JSON.parse(getInput('strip-hash')) : [],
        minimumChangeThreshold: parseInt(getInput('minimum-change-threshold'), 10),
        showTotal: toBool(getInput('show-total')),
        omitUnchanged: toBool(getInput('omit-unchanged')),
        collapseUnchanged: toBool(getInput('collapse-unchanged'))
    }

    return args
}
