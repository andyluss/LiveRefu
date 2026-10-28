// Example local plugin. Copy to design/projects/livedso/plugins/ and run:
//   node src/cli.ts check --plugins ./plugins
export default {
  name: 'brand-rules',
  check({ vault }) {
    const issues = []
    for (const token of vault.tokens.values()) {
      if (token.path.startsWith('product.') && !token.description) {
        issues.push({
          code: 'brand.product-description',
          severity: 'warn',
          path: token.path,
          message: 'product token 必须写 $description。'
        })
      }
    }
    return issues
  }
}
