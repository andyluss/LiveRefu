// SPDX-License-Identifier: UNLICENSED
import { resolve } from 'node:path'
import { createStore } from '../server/store.ts'
const store = createStore(process.env.DATA_FILE || resolve(import.meta.dirname, '../../../data/apps/ledger/store.json'))
store.reset(true)
console.log(`reset → ${store.file}`)
