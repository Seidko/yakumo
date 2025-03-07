import { register } from 'yakumo'
import { spawn } from 'child_process'
import { loadOptions } from 'mocha/lib/cli/options'
import { isNodeFlag } from 'mocha/lib/cli/node-flags'
import unparse from 'yargs-unparser'

const trimV8Option = value => value !== 'v8-options' && /^v8-/.test(value) ? value.slice(3) : value

register('mocha', async (project) => {
  const opts = loadOptions(process.argv.slice(3))
  if (opts._.length) {
    opts._ = opts._.flatMap((arg: string) => {
      const [folder] = arg.split('/', 1)
      const name = arg.slice(folder.length + 1) || '*'
      return project.locate(folder).map((path) => {
        return `${path}/tests/${name}.spec.ts`.slice(1)
      })
    })
  } else {
    opts._ = ['**/tests/*.spec.ts']
  }

  const mochaArgs = {}
  const nodeArgs = {}
  Object.keys(opts).forEach(opt => {
    if (isNodeFlag(opt)) {
      nodeArgs[trimV8Option(opt)] = opts[opt]
    } else {
      mochaArgs[opt] = opts[opt]
    }
  })

  const child = spawn(process.execPath, [
    ...unparse(nodeArgs),
    require.resolve('mocha/lib/cli/cli'),
    ...unparse(mochaArgs),
  ], {
    stdio: 'inherit',
    cwd: project.cwd,
  })

  child.on('exit', (code, signal) => {
    process.on('exit', () => {
      if (signal) {
        process.kill(process.pid, signal)
      } else {
        process.exit(code)
      }
    })
  })

  process.on('SIGINT', () => {
    child.kill('SIGINT')
  })
}, {
  manual: true,
})
