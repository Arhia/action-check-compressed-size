import { toBool, getDeltaText, iconForDifference, diffTable, fileExists, stripHash } from '../src/utils'

test('toBool', () => {
    expect(toBool('1')).toBe(true)
    expect(toBool('true')).toBe(true)
    expect(toBool('yes')).toBe(true)

    expect(toBool('0')).toBe(false)
    expect(toBool('false')).toBe(false)
    expect(toBool('no')).toBe(false)
})

test('getDeltaText', () => {
    expect(getDeltaText(5000, 25.5)).toBe('+5 kB (25.5%)')
    expect(getDeltaText(-5000, -25.5)).toBe('-5 kB (25.5%)')
    expect(getDeltaText(0, 0)).toBe('0 B')
})

test('iconForDifference', () => {
    expect(iconForDifference(0)).toBe('')
})

test('diffTable', () => {
    const files = [
        {
            filename: 'one.js',
            size: 5000,
            delta: 2500
        },
        {
            filename: 'two.js',
            size: 2500,
            delta: -2500
        },
        {
            filename: 'three.js',
            size: 300,
            delta: 0
        },
        {
            filename: 'four.js',
            size: 4500,
            delta: 9
        }
    ]
    const defaultOptions = {
        showTotal: true,
        collapseUnchanged: true,
        omitUnchanged: false,
        minimumChangeThreshold: 1
    }

    expect(diffTable(files, { ...defaultOptions }).markdown).toMatchSnapshot()
    expect(diffTable(files, { ...defaultOptions, showTotal: false }).markdown).toMatchSnapshot()
    expect(diffTable(files, { ...defaultOptions, collapseUnchanged: false }).markdown).toMatchSnapshot()
    expect(diffTable(files, { ...defaultOptions, omitUnchanged: true }).markdown).toMatchSnapshot()
    expect(diffTable(files, { ...defaultOptions, minimumChangeThreshold: 10 }).markdown).toMatchSnapshot()
    expect(
        diffTable(
            files.map(file => ({ ...file, delta: 0 })),
            { ...defaultOptions }
        ).markdown
    ).toMatchSnapshot()

    expect(diffTable([files[2]], { ...defaultOptions }).markdown).toMatchSnapshot()
})

test('diffTable', () => {
    const files = [
        {
            filename: 'one.js',
            size: 5000,
            delta: 2500
        },
        {
            filename: 'two.js',
            size: 4000,
            delta: -1000
        },
        {
            filename: 'three.js',
            size: 505,
            delta: 5
        }
    ]
    const defaultOptions = {
        showTotal: true,
        collapseUnchanged: true,
        omitUnchanged: false,
        minimumChangeThreshold: 100
    }
    const resultDiff = diffTable(files, { ...defaultOptions })
    expect(resultDiff.totalDelta).toEqual(1505)
    expect(resultDiff.totalSize).toEqual(9505)

    const filesInfo = resultDiff.filesInfo
    expect(filesInfo[0].isUnchanged).toBe(false)
    expect(filesInfo[0].difference).toEqual(100)

    expect(filesInfo[1].isUnchanged).toBe(false)
    expect(filesInfo[1].difference).toEqual(-20)

    expect(filesInfo[2].isUnchanged).toBe(true)
    expect(filesInfo[2].difference).toEqual(1)
})

test('fileExists', async () => {
    expect(await fileExists('package.json')).toBe(true)
    expect(await fileExists('file-that-does-not-exist')).toBe(false)
})

test('stripHash js', () => {
    expect(stripHash(['\\b\\w{5}\\.'])!('foo.abcde.js')).toBe('foo.js')
    expect(stripHash(['\\.(\\w{5})\\.chunk\\.js$'])!('foo.abcde.chunk.js')).toBe('foo.*****.chunk.js')
    expect(stripHash([])).toBe(undefined)
})

test('stripHash css', () => {
    expect(stripHash(['\\.(\\w{5})\\.chunk\\.css$'])!('foo.abcde.chunk.css')).toBe('foo.*****.chunk.css')
})

test('stripHash css file with js pattern', () => {
    expect(stripHash(['\\.(\\w{5})\\.chunk\\.js$'])!('foo.abcde.chunk.css')).toBe('foo.abcde.chunk.css')
})

test('stripHash several patterns', () => {
    expect(stripHash(['\\.(\\w{5})\\.chunk\\.js$', '\\.(\\w{5})\\.chunk\\.css$'])!('foo.abcde.chunk.js')).toBe(
        'foo.*****.chunk.js'
    )
    expect(stripHash(['\\.(\\w{5})\\.chunk\\.js$', '\\.(\\w{5})\\.chunk\\.css$'])!('foo.abcde.chunk.css')).toBe(
        'foo.*****.chunk.css'
    )
})
