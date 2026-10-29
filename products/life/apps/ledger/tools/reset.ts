// SPDX-License-Identifier: UNLICENSED
import { createStore } from '../server/store.ts'
const store = createStore()
store.reset(true)
console.log(`reset → ${store.file}`)
