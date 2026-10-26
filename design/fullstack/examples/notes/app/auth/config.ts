import { githubProvider } from '../qc.ts'

const github = process.env.GITHUB_ID && process.env.GITHUB_SECRET
  ? githubProvider(process.env.GITHUB_ID, process.env.GITHUB_SECRET)
  : null

export default {
  roles: ['user', 'admin'],
  passwordMin: 8,
  sessionDays: 30,
  secureCookie: false, // 本地 P2；生产用 HTTPS + true
  mail: { transport: 'console', from: 'notes@localhost' },
  oauth: github ? { github } : {},
}
