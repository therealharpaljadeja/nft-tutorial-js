// @ts-nocheck
import { near, UnorderedSet } from "near-sdk-js";
import { Contract, NFT_METADATA_SPEC, NFT_STANDARD_NAME } from ".";
import { restoreOwners } from "./internal";
import { JsonToken, Token } from "./metadata";
import { internalNftToken } from "./nft_core";

//Query for the total supply of NFTs on the contract
export function internalTotalSupply({
    contract,
}: {
    contract: Contract;
}): number {
    /*
        FILL THIS IN
    */
    return contract.tokenMetadataById.len();
}

//Query for nft tokens on the contract regardless of the owner using pagination
export function internalNftTokens({
    contract,
    fromIndex,
    limit,
}: {
    contract: Contract;
    fromIndex?: string;
    limit?: number;
}): JsonToken[] {
    /*
        FILL THIS IN
    */
    let tokens: JsonToken[] = [];
    let start = fromIndex ? parseInt(fromIndex) : 0;
    let max = limit ? parseInt(limit) : 50;

    let keys = contract.tokenMetadataById.toArray();
    for (let i = start; i < keys.length && i < max; i++) {
        let jsonToken = internalNftToken({ contract, tokenId: keys[i][0] });
        tokens.push(jsonToken);
    }
    return tokens;
}

//get the total supply of NFTs for a given owner
export function internalSupplyForOwner({
    contract,
    accountId,
}: {
    contract: Contract;
    accountId: string;
}): number {
    /*
        FILL THIS IN
    */
    let tokens = restoreOwners(contract.tokensPerOwner.get(accountId));
    if (tokens == null) {
        return 0;
    }

    return tokens.len();
}

//Query for all the tokens for an owner
export function internalTokensForOwner({
    contract,
    accountId,
    fromIndex,
    limit,
}: {
    contract: Contract;
    accountId: string;
    fromIndex?: string;
    limit?: number;
}): JsonToken[] {
    /*
        FILL THIS IN
    */
    let tokenSet = restoreOwners(contract.tokensPerOwner.get(accountId));

    if (tokenSet == null) {
        return [];
    }

    let start = fromIndex ? parseInt(fromIndex) : 0;
    let max = limit ? parseInt(limit) : 50;

    let keys = tokenSet.toArray();
    let tokens: JsonToken[] = [];
    for (let i = start; i < max; i++) {
        if (i >= keys.length) {
            break;
        }
        let token = internalNftToken({ contract, tokenId: keys[i] });
        tokens.push(token);
    }

    return tokens;
}
