import { getInput } from '@actions/core'
type Args = {
    repoToken: string
    directory: string
    compression: string
    pattern: string
    exclude: string
    stripHashPattern: string[]
}

export function getAndValidateArgs(): Args {
    const args = {
        repoToken: getInput('repo-token', { required: true }),
        directory: getInput('directory'),
        pattern: getInput('pattern') || '**/dist/**/*.js',
        exclude: getInput('exclude') || '{**/*.map,**/node_modules/**}',
        compression: getInput('compression'),
        stripHashPattern: getInput('strip-hash') ? JSON.parse(getInput('strip-hash')) : []
    }

    return args
}
