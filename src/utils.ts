import fs from 'fs'
import prettyBytes from 'pretty-bytes'

/**
 * Check if a given file exists and can be accessed.
 * @param {string} filename
 */
export async function fileExists(filename: string): Promise<boolean> {
    try {
        await fs.promises.access(filename, fs.constants.F_OK)
        return true
    } catch (e) {
        return false
    }
}

/**
 * Remove any matched hash patterns from a filename string.
 * @returns {(((fileName: string) => string) | undefined)}
 */
export function stripHash(allRegex: string[]): ((fileName: string) => string) | undefined {
    if (allRegex && allRegex.length) {
        return function (fileName: string): string {
            let finalStr = fileName
            for (const regex of allRegex) {
                finalStr = finalStr.replace(new RegExp(regex), (str, ...hashes) => {
                    hashes = hashes.slice(0, -2).filter(c => c != null)
                    if (hashes.length) {
                        for (const hash of hashes) {
                            const hashFormatted = hash || ''
                            str = str.replace(hashFormatted, hashFormatted.replace(/./g, '*'))
                        }
                        return str
                    }
                    return ''
                })
            }
            return finalStr
        }
    }

    return undefined
}

export function getDeltaText(delta: number, difference: number): string {
    let deltaText = (delta > 0 ? '+' : '') + prettyBytes(delta)
    if (delta && Math.abs(delta) > 1) {
        deltaText += ` (${Math.abs(difference)}%)`
    }
    return deltaText
}

export function iconForDifference(difference: number): string {
    let icon = ''
    if (difference >= 50) icon = '🆘'
    else if (difference >= 20) icon = '🚨'
    else if (difference >= 10) icon = '⚠️'
    else if (difference >= 5) icon = '🔍'
    else if (difference <= -50) icon = '🏆'
    else if (difference <= -20) icon = '🎉'
    else if (difference <= -10) icon = '👏'
    else if (difference <= -5) icon = '✅'
    return icon
}

/**
 * Create a Markdown table from text rows
 */
function markdownTable(rows: string[][]): string {
    if (!rows.length) {
        return ''
    }

    // Skip all empty columns
    while (rows.every(columns => !columns[columns.length - 1])) {
        for (const columns of rows) {
            columns.pop()
        }
    }

    const [firstRow] = rows
    const columnLength = firstRow.length
    if (columnLength === 0) {
        return ''
    }

    return [
        // Header
        ['Filename', 'Size', 'Change', ''].slice(0, columnLength),
        // Align
        [':---', ':---:', ':---:', ':---:'].slice(0, columnLength),
        // Body
        ...rows
    ]
        .map(columns => `| ${columns.join(' | ')} |`)
        .join('\n')
}

export interface FileDiff {
    filename: string
    size: number
    delta: number
}

interface DiffOptions {
    showTotal: boolean
    collapseUnchanged: boolean
    omitUnchanged: boolean
    minimumChangeThreshold: number
}

interface FileInfo {
    filename: string
    difference: number
    isUnchanged: boolean
}

interface ResultDiff {
    markdown: string
    totalSize: number
    totalDelta: number
    totalDeltaText: string
    filesInfo: FileInfo[]
}

/**
 * Create a Markdown table showing diff data
 */
export function diffTable(
    files: FileDiff[],
    { showTotal, collapseUnchanged, omitUnchanged, minimumChangeThreshold }: DiffOptions
): ResultDiff {
    const changedRows = []
    const unChangedRows = []
    const filesInfo: FileInfo[] = []

    let totalSize = 0
    let totalDelta = 0
    for (const file of files) {
        const { filename, size, delta } = file
        totalSize += size
        totalDelta += delta

        const sizeBefore = size - delta
        const difference = ((delta / sizeBefore) * 100) | 0
        const isUnchanged = Math.abs(delta) < minimumChangeThreshold

        filesInfo.push({
            filename,
            difference,
            isUnchanged
        })

        if (isUnchanged && omitUnchanged) continue

        const columns = [
            `\`${filename}\``,
            prettyBytes(size),
            getDeltaText(delta, difference),
            iconForDifference(difference)
        ]
        if (isUnchanged && collapseUnchanged) {
            unChangedRows.push(columns)
        } else {
            changedRows.push(columns)
        }
    }

    let out = markdownTable(changedRows)

    if (unChangedRows.length !== 0) {
        const outputUnchanged = markdownTable(unChangedRows)
        out += `\n\n<details><summary>ℹ️ <strong>View Unchanged</strong></summary>\n\n${outputUnchanged}\n\n</details>\n\n`
    }

    let totalDeltaText = ''
    if (showTotal) {
        const totalSizeBefore = totalSize - totalDelta
        const totalDifference = ((totalDelta / totalSizeBefore) * 100) | 0
        totalDeltaText = getDeltaText(totalDelta, totalDifference)
        const totalIcon = iconForDifference(totalDifference)
        out = `**Total Size:** ${prettyBytes(totalSize)}\n\n${out}`
        out = `**Size Change:** ${totalDeltaText} ${totalIcon}\n\n${out}`
    }

    return {
        markdown: out,
        totalSize,
        totalDelta,
        totalDeltaText,
        filesInfo
    }
}

/**
 * Convert a string "true"/"yes"/"1" argument value to a boolean
 */
export function toBool(v: string): boolean {
    return /^(1|true|yes)$/.test(v)
}
