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
#pragma once

#ifdef __cplusplus
extern "C" {
#endif

#include "coin.h"
#include <stdbool.h>
#include <stdint.h>

// Returns the address encoding for a (coin type, hrp) pair, or UNSUPPORTED when
// the pair is not allowed. `path` is the hardened coin type element of the
// derivation path (hdPath[1]).
address_encoding_e checkChainConfig(uint32_t path, const char *hrp,
                                    uint8_t hrpLen);

// Returns true when `path`, the hardened coin type element of the derivation
// path (hdPath[1]), is one the app can handle: a built-in default (118 or 60)
// or a coin type declared in the chain configuration.
bool isSupportedCoinType(uint32_t path);

#ifdef __cplusplus
}
#endif
