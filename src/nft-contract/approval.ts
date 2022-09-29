// @ts-nocheck
import { assert, bytes, near } from "near-sdk-js";
import { Contract, NFT_METADATA_SPEC, NFT_STANDARD_NAME } from ".";
import {
    assertAtLeastOneYocto,
    assertOneYocto,
    bytesForApprovedAccountId,
    internalAddTokenToOwner,
    refundDeposit,
    refundApprovedAccountIds,
    refundApprovedAccountIdsIter,
} from "./internal";
import { Token } from "./metadata";

const GAS_FOR_NFT_ON_APPROVE = 35_000_000_000_000;

//approve an account ID to transfer a token on your behalf
export function internalNftApprove({
    contract,
    tokenId,
    accountId,
    msg,
}: {
    contract: Contract;
    tokenId: string;
    accountId: string;
    msg: string;
}) {
    /*
        FILL THIS IN
    */
    assertAtLeastOneYocto();

    let token = contract.tokensById.get(tokenId) as Token;
    if (token == null) {
        near.panic("no token");
    }
    assert(
        near.predecessorAccountId() === token.owner_id,
        "Predecessor must be the token owner"
    );

    let approvalId = token.next_approval_id;
    let isNewApproval = token.approved_account_ids.hasOwnProperty(accountId);
    token.approved_account_ids[accountId] = approvalId;
    let storageUsed = isNewApproval ? bytesForApprovedAccountId(accountId) : 0;

    token.next_approval_id += 1;
    //insert the token back into the tokens_by_id collection
    contract.tokensById.set(tokenId, token);
    refundDeposit(BigInt(storageUsed));

    if (msg != null) {
        // Initiating receiver's call and the callback
        const promise = near.promiseBatchCreate(accountId);
        near.promiseBatchActionFunctionCall(
            promise,
            "nft_on_approve",
            bytes(
                JSON.stringify({
                    token_id: tokenId,
                    owner_id: token.owner_id,
                    approval_id: approvalId,
                    msg,
                })
            ),
            0, // no deposit
            GAS_FOR_NFT_ON_APPROVE
        );

        near.promiseReturn(promise);
    }
}

//check if the passed in account has access to approve the token ID
export function internalNftIsApproved({
    contract,
    tokenId,
    approvedAccountId,
    approvalId,
}: {
    contract: Contract;
    tokenId: string;
    approvedAccountId: string;
    approvalId: number;
}) {
    /*
        FILL THIS IN
    */
    //get the token object from the token_id
    let token = contract.tokensById.get(tokenId) as Token;
    if (token == null) {
        near.panic("no token");
    }

    //get the approval number for the passed in account ID
    let approval = token.approved_account_ids[approvedAccountId];

    //if there was no approval ID found for the account ID, we simply return false
    if (approval == null) {
        return false;
    }

    //if there was some approval ID found for the account ID
    //if there was no approval_id passed into the function, we simply return true
    if (approvalId == null) {
        return true;
    }

    //if a specific approval_id was passed into the function
    //return if the approval ID passed in matches the actual approval ID for the account
    return approvalId == approval;
}

//revoke a specific account from transferring the token on your behalf
export function internalNftRevoke({
    contract,
    tokenId,
    accountId,
}: {
    contract: Contract;
    tokenId: string;
    accountId: string;
}) {
    /*
        FILL THIS IN
    */
    assertOneYocto();

    //get the token object using the passed in token_id
    let token = contract.tokensById.get(tokenId) as Token;
    if (token == null) {
        near.panic("no token");
    }

    //get the caller of the function and assert that they are the owner of the token
    let predecessorAccountId = near.predecessorAccountId();
    assert(
        predecessorAccountId == token.owner_id,
        "only token owner can revoke"
    );

    //if the account ID was in the token's approval, we remove it
    if (token.approved_account_ids.hasOwnProperty(accountId)) {
        delete token.approved_account_ids[accountId];

        //refund the funds released by removing the approved_account_id to the caller of the function
        refundApprovedAccountIdsIter(predecessorAccountId, [accountId]);

        //insert the token back into the tokens_by_id collection with the account_id removed from the approval list
        contract.tokensById.set(tokenId, token);
    }
}

//revoke all accounts from transferring the token on your behalf
export function internalNftRevokeAll({
    contract,
    tokenId,
}: {
    contract: Contract;
    tokenId: string;
}) {
    /*
        FILL THIS IN
    */
}
