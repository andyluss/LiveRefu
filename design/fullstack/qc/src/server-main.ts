import { startServer } from './server.ts'

const appRoot = process.env.QC_APP_ROOT ?? process.cwd()
startServer({ appRoot })
  .then(({ url }) => console.log(`[qc] ${url}`))
  .catch(error => {
    console.error('[qc] 启动失败')
    console.error(error)
    process.exit(1)
  })
