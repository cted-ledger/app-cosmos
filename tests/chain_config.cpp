/*******************************************************************************
 *   (c) 2018 - 2023 Zondax AG
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
 ********************************************************************************/

#include "gtest/gtest.h"
#include <chain_config.h>
#include <coin.h>
#include <string.h>

namespace {

// Hardened coin type element of a derivation path, as received in hdPath[1]
constexpr uint32_t hardened(uint32_t coinType) {
  return 0x80000000u | coinType;
}

address_encoding_e check(uint32_t coinType, const char *hrp) {
  return checkChainConfig(hardened(coinType), hrp, (uint8_t)strlen(hrp));
}

TEST(ChainConfigTest, DefaultCosmosCoinTypeAcceptsAnyHrp) {
  // 118 short-circuits: the table is not consulted, so an HRP that has no entry
  // is still accepted. This is what lets a new Cosmos chain ship without any
  // firmware change.
  EXPECT_EQ(check(118, "cosmos"), BECH32_COSMOS);
  EXPECT_EQ(check(118, "osmo"), BECH32_COSMOS);
  EXPECT_EQ(check(118, "gonka"), BECH32_COSMOS);
  EXPECT_EQ(check(118, "someunlistedchain"), BECH32_COSMOS);
}

TEST(ChainConfigTest, EthCoinTypeIsRestrictedToItsHrps) {
  EXPECT_EQ(check(60, "inj"), BECH32_ETH);
  EXPECT_EQ(check(60, "evmos"), BECH32_ETH);
  EXPECT_EQ(check(60, "cosmos"), UNSUPPORTED);
  EXPECT_EQ(check(60, "gonka"), UNSUPPORTED);
}

TEST(ChainConfigTest, GonkaCoinTypeIsBoundToItsHrp) {
  // Gonka derives on its registered SLIP-0044 coin type 1200
  EXPECT_EQ(check(1200, "gonka"), BECH32_COSMOS);
  // and only on its own HRP: 1200 does not inherit the 118 short-circuit
  EXPECT_EQ(check(1200, "cosmos"), UNSUPPORTED);
  EXPECT_EQ(check(1200, "inj"), UNSUPPORTED);
}

TEST(ChainConfigTest, HrpMatchIsExactNotAPrefix) {
  EXPECT_EQ(check(1200, "gonk"), UNSUPPORTED);
  EXPECT_EQ(check(1200, "gonkavaloper"), UNSUPPORTED);
  EXPECT_EQ(check(60, "in"), UNSUPPORTED);
}

TEST(ChainConfigTest, UnknownCoinTypeIsUnsupported) {
  EXPECT_EQ(check(529, "secret"), UNSUPPORTED);
  EXPECT_EQ(check(0, "cosmos"), UNSUPPORTED);
}

TEST(ChainConfigTest, SupportedCoinTypes) {
  EXPECT_TRUE(isSupportedCoinType(hardened(118)));
  EXPECT_TRUE(isSupportedCoinType(hardened(60)));
  EXPECT_TRUE(isSupportedCoinType(hardened(1200)));
}

TEST(ChainConfigTest, UnsupportedCoinTypes) {
  EXPECT_FALSE(isSupportedCoinType(hardened(529)));
  EXPECT_FALSE(isSupportedCoinType(hardened(1199)));
  EXPECT_FALSE(isSupportedCoinType(hardened(0)));
}

TEST(ChainConfigTest, CoinTypeMustBeHardened) {
  // hdPath[1] is always hardened; an unhardened value must not slip through
  EXPECT_FALSE(isSupportedCoinType(118));
  EXPECT_FALSE(isSupportedCoinType(60));
  EXPECT_FALSE(isSupportedCoinType(1200));
}

} // namespace
