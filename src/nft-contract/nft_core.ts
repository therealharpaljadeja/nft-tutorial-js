// @ts-nocheck
import { assert, bytes, near } from "near-sdk-js";
import { Contract } from ".";
import {
    assertOneYocto,
    internalAddTokenToOwner,
    internalRemoveTokenFromOwner,
    internalTransfer,
    refundApprovedAccountIds,
} from "./internal";
import { JsonToken, Token, TokenMetadata } from "./metadata";

const GAS_FOR_RESOLVE_TRANSFER = 40_000_000_000_000;
const GAS_FOR_NFT_ON_TRANSFER = 35_000_000_000_000;

//get the information for a specific token ID
export function internalNftToken({
    contract,
    tokenId,
}: {
    contract: Contract;
    tokenId: string;
}) {
    /*
        FILL THIS IN
    */
    let token = contract.tokensById.get(tokenId);
    if (token == null) return null;

    let metadata = contract.tokenMetadataById.get(tokenId) as TokenMetadata;
    let jsonToken = new JsonToken({
        tokenId: tokenId,
        metadata,
        ownerId: token.owner_id,
        approvedAccountIds: token.approved_account_ids,
    });

    return jsonToken;
}

//implementation of the nft_transfer method. This transfers the NFT from the current owner to the receiver.
export function internalNftTransfer({
    contract,
    receiverId,
    tokenId,
    approvalId,
    memo,
}: {
    contract: Contract;
    receiverId: string;
    tokenId: string;
    approvalId: number;
    memo: string;
}) {
    /*
        FILL THIS IN
    */
    assertOneYocto();

    let senderId = near.predecessorAccountId();
    internalTransfer(contract, senderId, receiverId, tokenId, memo);
    refundApprovedAccountIds(
        previousToken.owner_id,
        previousToken.approved_account_ids
    );
}

//implementation of the transfer call method. This will transfer the NFT and call a method on the receiver_id contract
export function internalNftTransferCall({
    contract,
    receiverId,
    tokenId,
    approvalId,
    memo,
    msg,
}: {
    contract: Contract;
    receiverId: string;
    tokenId: string;
    approvalId: number;
    memo: string;
    msg: string;
}) {
    /*
        FILL THIS IN
    */
    assertOneYocto();
    let senderId = near.predecessorAccountId();

    let previousToken = internalTransfer(
        contract,
        senderId,
        receiverId,
        tokenId,
        memo
    );

    const promise = near.promiseBatchCreate(receiverId);
    near.promiseBatchActionFunctionCall(
        promise,
        "nft_on_transfer",
        bytes(
            JSON.stringify({
                sender_id: senderId,
                previous_owner_id: previousToken.owner_id,
                tokenId: tokenId,
                msg,
            })
        ),
        0,
        GAS_FOR_NFT_ON_TRANSFER
    );

    near.promiseThen(
        promise,
        near.currentAccountId(),
        "nft_resolve_transfer",
        bytes(
            JSON.stringify({
                owner_id: previousToken.owner_id,
                receiver_id: receiverId,
                token_id: tokenId,
                approved_account_ids: previousToken.approved_account_ids,
            })
        ),
        0,
        GAS_FOR_RESOLVE_TRANSFER
    );

    return near.promiseReturn(promise);
}

//resolves the cross contract call when calling nft_on_transfer in the nft_transfer_call method
//returns true if the token was successfully transferred to the receiver_id
export function internalResolveTransfer({
    contract,
    authorizedId,
    ownerId,
    receiverId,
    tokenId,
    approvedAccountIds,
    memo,
}: {
    contract: Contract;
    authorizedId: string;
    ownerId: string;
    receiverId: string;
    tokenId: string;
    approvedAccountIds: { [key: string]: number };
    memo: string;
}) {
    /*
        FILL THIS IN
    */

    assert(
        near.currentAccountId() === near.predecessorAccountId(),
        "Only the contract itself can call this method"
    );

    let result = near.promiseResult(0);
    if (typeof result === "string") {
        if (result === "false") {
            refundApprovedAccountIds(ownerId, approvedAccountIds);
            return true;
        }
    }

    let token = contract.tokensById.get(tokenId) as Token;
    if (token !== null) {
        if (token.owner_id != receiverId) {
            refundApprovedAccountIds(ownerId, approvedAccountIds);
            return true;
        }
    } else {
        return true;
    }

    internalRemoveTokenFromOwner(contract, receiverId, tokenId);
    internalAddTokenToOwner(contract, ownerId, tokenId);
    refundApprovedAccountIds(receiverId, token.approved_account_ids);

    token.owner_id = ownerId;

    contract.tokensById.set(tokenId, token);
    return false;
}
