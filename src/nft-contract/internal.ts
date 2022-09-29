import { assert, near, UnorderedSet, Vector } from "near-sdk-js";
import { Contract, NFT_METADATA_SPEC, NFT_STANDARD_NAME } from ".";
import { Token } from "./metadata";

export function restoreOwners(collection) {
    if (collection == null) {
        return null;
    }
    return UnorderedSet.deserialize(collection as UnorderedSet);
}

export function refundDeposit(storageUsed: bigint) {
    let requiredCost = storageUsed * near.storageByteCost().valueOf();
    let attachedDeposit = near.attachedDeposit().valueOf();

    assert(
        attachedDeposit >= requiredCost,
        `Must attach ${requiredCost} yoctoNear to cover storage`
    );

    let refund = attachedDeposit - requiredCost;
    near.log(`Refunded ${refund} yoctoNear`);

    if (refund > 1) {
        const promise = near.promiseBatchCreate(near.predecessorAccountId());
        near.promiseBatchActionTransfer(promise, refund);
    }
}

export function internalAddTokenToOwner(
    contract: Contract,
    accountId: string,
    tokenId: string
) {
    let tokenSet = restoreOwners(contract.tokensPerOwner.get(accountId));
    if (tokenSet == null) {
        tokenSet = new UnorderedSet("tokensPerOwner" + accountId.toString());
    }

    tokenSet.set(tokenId);

    contract.tokensPerOwner.set(accountId, tokenSet);
}

export function assertOneYocto() {
    assert(
        near.attachedDeposit().toString() === "1",
        "Requires attached deposit of exactly 1 yoctoNEAR"
    );
}

export function internalTransfer(
    contract: Contract,
    senderId: string,
    receiverId: string,
    tokenId: string,
    approvalId: number,
    memo: string
): Token {
    let token = contract.tokensById.get(tokenId) as Token;
    if (token == null) {
        near.panic("no token found");
    }

    if (senderId != token.owner_id) {
        //if the token's approved account IDs doesn't contain the sender, we panic
        if (!token.approved_account_ids.hasOwnProperty(senderId)) {
            near.panic("Unauthorized");
        }

        // If they included an approval_id, check if the sender's actual approval_id is the same as the one included
        if (approvalId != null) {
            //get the actual approval ID
            let actualApprovalId = token.approved_account_ids[senderId];
            //if the sender isn't in the map, we panic
            if (actualApprovalId == null) {
                near.panic("Sender is not approved account");
            }

            //make sure that the actual approval ID is the same as the one provided
            assert(
                actualApprovalId == approvalId,
                `The actual approval_id ${actualApprovalId} is different from the given approval_id ${approvalId}`
            );
        }
    }

    assert(
        token.owner_id !== receiverId,
        "The token owner and receiver should be different"
    );

    internalRemoveTokenFromOwner(contract, token.owner_id, tokenId);
    internalAddTokenToOwner(contract, receiverId, tokenId);

    let newToken = new Token({
        ownerId: receiverId,
        approvedAccountIds: {},
        nextApprovalId: token.next_approval_id,
    });

    contract.tokensById.set(tokenId, newToken);

    if (memo != null) {
        near.log(`Memo: ${memo}`);
    }

    return token;
}

export function internalRemoveTokenFromOwner(
    contract: Contract,
    accountId: string,
    tokenId: string
) {
    let tokenSet = restoreOwners(contract.tokensPerOwner.get(accountId));

    if (tokenSet == null) {
        near.panic("Account holds no tokens");
    }

    tokenSet.remove(tokenId);

    if (tokenSet.isEmpty()) {
        contract.tokensPerOwner.remove(accountId);
    } else {
        contract.tokensPerOwner.set(accountId, tokenSet);
    }
}

//Assert that the user has attached at least 1 yoctoNEAR (for security reasons and to pay for storage)
export function assertAtLeastOneYocto() {
    assert(
        near.attachedDeposit().valueOf() >= BigInt(1),
        "Requires attached deposit of at least 1 yoctoNEAR"
    );
}

//calculate how many bytes the account ID is taking up
export function bytesForApprovedAccountId(accountId: string): number {
    // The extra 4 bytes are coming from Borsh serialization to store the length of the string.
    return accountId.length + 4 + 8;
}

export function refundApprovedAccountIdsIter(
    accountId: string,
    approvedAccountIds: string[]
) {
    //get the storage total by going through and summing all the bytes for each approved account IDs
    let storageReleased = approvedAccountIds
        .map((e) => bytesForApprovedAccountId(e))
        .reduce((partialSum, a) => partialSum + a, 0);
    let amountToTransfer =
        BigInt(storageReleased) * near.storageByteCost().valueOf();

    // Send the money to the beneficiary (TODO: don't use batch actions)
    const promise = near.promiseBatchCreate(accountId);
    near.promiseBatchActionTransfer(promise, amountToTransfer);
}

//refund a map of approved account IDs and send the funds to the passed in account ID
export function refundApprovedAccountIds(
    accountId: string,
    approvedAccountIds: { [key: string]: number }
) {
    //call the refundApprovedAccountIdsIter with the approved account IDs as keys
    refundApprovedAccountIdsIter(accountId, Object.keys(approvedAccountIds));
}
