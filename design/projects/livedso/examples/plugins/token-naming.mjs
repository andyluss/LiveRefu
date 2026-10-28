// Example local plugin: flag product tokens without a two-level namespace.
export default {
  name: 'token-naming',
  check({ vault }) {
    return [...vault.tokens.values()]
      .filter(t => t.path.startsWith('product.') && t.path.split('.').length < 3)
      .map(t => ({
        code: 'naming.product-depth',
        severity: 'warn',
        path: t.path,
        message: 'product token 建议使用 product.<域>.<名> 至少三层。'
      }))
  }
}
