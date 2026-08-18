/** ******************************************************************************
 *  (c) 2018 - 2024 Zondax AG
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ******************************************************************************* */

import Zemu, { zondaxMainmenuNavigation, ButtonKind, isTouchDevice } from '@zondax/zemu'
import  CosmosApp  from '@zondax/ledger-cosmos-js'
import { defaultOptions, DEVICE_MODELS } from './common'

// @ts-ignore
// import secp256k1 from 'secp256k1/elliptic'

jest.setTimeout(90000)

describe('Standard', function () {
  test.concurrent.each(DEVICE_MODELS)('can start and stop container', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('main menu', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
      const nav = zondaxMainmenuNavigation(m.name, [1, 0, 0, 4, -5])
      await sim.navigateAndCompareSnapshots('.', `${m.prefix.toLowerCase()}-mainmenu`, nav.schedule)
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('get app version', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
      const app = new CosmosApp(sim.getTransport())
      const resp = await app.getVersion()

      console.log(resp)

      expect(resp).toHaveProperty('major')
      expect(resp).toHaveProperty('minor')
      expect(resp).toHaveProperty('patch')
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('get address', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
      const app = new CosmosApp(sim.getTransport())

      // Derivation path. First 3 items are automatically hardened!
      const path = "m/44'/118'/5'/0/3"
      const resp = await app.getAddressAndPubKey(path, 'cosmos')

      console.log(resp)

      expect(resp).toHaveProperty('bech32_address')
      expect(resp).toHaveProperty('compressed_pk')

      expect(resp.bech32_address).toEqual('cosmos1wkd9tfm5pqvhhaxq77wv9tvjcsazuaykwsld65')
      expect(resp.compressed_pk.length).toEqual(33)
      expect(resp.compressed_pk.toString("hex")).toEqual('035c986b9ae5fbfb8e1e9c12c817f5ef8fdb821cdecaa407f1420ec4f8f1d766bf')
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('show address', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({
        ...defaultOptions,
        model: m.name,
        approveKeyword: isTouchDevice(m.name) ? 'Confirm' : '',
        approveAction: ButtonKind.DynamicTapButton,
      })
      const app = new CosmosApp(sim.getTransport())

      // Derivation path. First 3 items are automatically hardened!
      const path = "m/44'/118'/5'/0/3"
      const respRequest = app.showAddressAndPubKey(path, 'cosmos')
      // Wait until we are not in the main menu
      await sim.waitUntilScreenIsNot(sim.getMainMenuSnapshot())
      await sim.compareSnapshotsAndApprove('.', `${m.prefix.toLowerCase()}-show_address`)

      const resp = await respRequest
      console.log(resp)

      expect(resp).toHaveProperty('bech32_address')
      expect(resp).toHaveProperty('compressed_pk')

      expect(resp.bech32_address).toEqual('cosmos1wkd9tfm5pqvhhaxq77wv9tvjcsazuaykwsld65')
      expect(resp.compressed_pk.length).toEqual(33)
      expect(resp.compressed_pk.toString("hex")).toEqual('035c986b9ae5fbfb8e1e9c12c817f5ef8fdb821cdecaa407f1420ec4f8f1d766bf')
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('show Eth address', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({
        ...defaultOptions,
        model: m.name,
        approveKeyword: isTouchDevice(m.name) ? 'Confirm' : '',
        approveAction: ButtonKind.DynamicTapButton,
      })
      const app = new CosmosApp(sim.getTransport())

      // Derivation path. First 3 items are automatically hardened!
      const path = "m/44'/60'/0'/0/1"
      const hrp = 'inj'

      // check with invalid HRP
      const errorRespPk = app.getAddressAndPubKey(path, 'cosmos')
      await expect(errorRespPk).rejects.toMatchObject({
        returnCode: 0x698C,
        errorMessage: 'Chain config not supported'
      })

      const respRequest = app.showAddressAndPubKey(path, hrp)
      // Wait until we are not in the main menu
      await sim.waitUntilScreenIsNot(sim.getMainMenuSnapshot())
      await sim.compareSnapshotsAndApprove('.', `${m.prefix.toLowerCase()}-show_eth_address`)

      const resp = await respRequest
      console.log(resp)

      expect(resp).toHaveProperty('bech32_address')
      expect(resp).toHaveProperty('compressed_pk')

      expect(resp.compressed_pk.length).toEqual(33)

      // Verify address
      const secp256k1 = require("secp256k1");
      const keccak = require("keccak256");
      const { bech32 } = require("bech32");

      // Take the compressed pubkey and verify that the expected address can be computed
      const uncompressPubKeyUint8Array = secp256k1.publicKeyConvert(resp.compressed_pk, false).subarray(1);
      const ethereumAddressBuffer = Buffer.from(keccak(Buffer.from(uncompressPubKeyUint8Array))).subarray(-20);
      const eth_address = bech32.encode(hrp, bech32.toWords(ethereumAddressBuffer)); // "cosmos15n2h0lzvfgc8x4fm6fdya89n78x6ee2fm7fxr3"

      expect(resp.bech32_address).toEqual(eth_address)
      expect(resp.bech32_address).toEqual('inj15n2h0lzvfgc8x4fm6fdya89n78x6ee2f3h7z3f')
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('get gonka address', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
      const app = new CosmosApp(sim.getTransport())

      // Gonka derives on its registered SLIP-0044 coin type 1200
      const path = "m/44'/1200'/0'/0/0"
      const resp = await app.getAddressAndPubKey(path, 'gonka')

      console.log(resp)

      expect(resp).toHaveProperty('bech32_address')
      expect(resp).toHaveProperty('compressed_pk')

      expect(resp.bech32_address).toEqual('gonka1j0pzd70wr9muhpdp5ahladpzznq95lr3xwkrsg')
      expect(resp.compressed_pk.length).toEqual(33)
      expect(resp.compressed_pk.toString('hex')).toEqual(
        '03a817a68f61b9ad3fb34e45a48f1dbb957b2bf81211cf61b2818bddc5550492a0'
      )
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('gonka coin type rejects another hrp', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
      const app = new CosmosApp(sim.getTransport())

      // Unlike coin type 118, coin type 1200 is bound to the gonka hrp
      const resp = app.getAddressAndPubKey("m/44'/1200'/0'/0/0", 'cosmos')

      await expect(resp).rejects.toMatchObject({
        returnCode: 0x698c,
        errorMessage: 'Chain config not supported',
      })
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('reject unknown coin type', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
      const app = new CosmosApp(sim.getTransport())

      // 529 (Secret Network) has no chain config entry: rejected at the APDU layer
      const resp = app.getAddressAndPubKey("m/44'/529'/0'/0/0", 'secret')

      await expect(resp).rejects.toMatchObject({
        returnCode: 0x698b,
        errorMessage: 'Invalid HD Path Coin Value',
      })
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('show address HUGE', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({
        ...defaultOptions,
        model: m.name,
        approveKeyword: isTouchDevice(m.name) ? 'Confirm' : '',
        approveAction: ButtonKind.DynamicTapButton,
      })
      const app = new CosmosApp(sim.getTransport())

      // Derivation path. First 3 items are automatically hardened!
      const path = "m/44'/118'/2147483647'/0/4294967295"
      const resp = app.showAddressAndPubKey(path, 'cosmos')
      console.log(resp)

      await expect(resp).rejects.toMatchObject({
        returnCode: 0x6989,
        errorMessage: 'Invalid HD Path Value. Expert Mode required.'
      })
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('show address HUGE Expert', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({
        ...defaultOptions,
        model: m.name,
        approveKeyword: isTouchDevice(m.name) ? 'Confirm' : '',
        approveAction: ButtonKind.DynamicTapButton,
      })
      const app = new CosmosApp(sim.getTransport())

      // Activate expert mode
      await sim.toggleExpertMode();

      // Derivation path. First 3 items are automatically hardened!
      const path = "m/44'/118'/2147483647'/0/4294967295"
      const respRequest = app.showAddressAndPubKey(path, 'cosmos')

      // Wait until we are not in the main menu
      await sim.waitUntilScreenIsNot(sim.getMainMenuSnapshot())
      await sim.compareSnapshotsAndApprove('.', `${m.prefix.toLowerCase()}-show_address_huge`)

      const resp = await respRequest
      console.log(resp)

      expect(resp).toHaveProperty('bech32_address')
      expect(resp).toHaveProperty('compressed_pk')

      expect(resp.bech32_address).toEqual('cosmos1ex7gkwwmq4vcgdwcalaq3t20pgwr37u6ntkqzh')
      expect(resp.compressed_pk.length).toEqual(33)
    } finally {
      await sim.close()
    }
  })
})
