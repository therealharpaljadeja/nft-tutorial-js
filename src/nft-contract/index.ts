// @ts-nocheck
import {
    NearContract,
    NearBindgen,
    call,
    view,
    LookupMap,
    UnorderedMap,
    UnorderedSet,
    assert,
    near,
} from "near-sdk-js";
import { NFTContractMetadata, Token, TokenMetadata } from "./metadata";
import { internalMint } from "./mint";
import {
    internalNftTokens,
    internalSupplyForOwner,
    internalTokensForOwner,
    internalTotalSupply,
} from "./enumeration";
import {
    internalNftToken,
    internalNftTransfer,
    internalNftTransferCall,
    internalResolveTransfer,
} from "./nft_core";
import {
    internalNftApprove,
    internalNftIsApproved,
    internalNftRevoke,
    internalNftRevokeAll,
} from "./approval";
import { internalNftPayout, internalNftTransferPayout } from "./royalty";

/// This spec can be treated like a version of the standard.
export const NFT_METADATA_SPEC = "nft-1.0.0";

/// This is the name of the NFT standard we're using
export const NFT_STANDARD_NAME = "nep171";

@NearBindgen
export class Contract extends NearContract {
    /*
        FILL THIS IN
    */
    owner_id: string;
    tokensPerOwner: LookupMap<AccountId, UnorderedSet<TokenId>>;
    tokensById: LookupMap<TokenId, Token>;
    tokenMetadataById: UnorderedMap<TokenId, TokenMetadata>;
    metadata: NFTContractMetadata;

    /*
        initialization function (can only be called once).
        this initializes the contract with metadata that was passed in and
        the owner_id. 
    */
    constructor({
        owner_id,
        metadata = {
            spec: "nft-1.0.0",
            name: "NearPass",
            symbol: "NP",
        },
    }) {
        /*
        FILL THIS IN
    */
        super();
        this.owner_id = owner_id;
        this.tokensPerOwner = new LookupMap("tokensPerOwner");
        this.tokensById = new LookupMap("tokensById");
        this.tokenMetadataById = new UnorderedMap("tokenMetadataById");
        this.metadata = metadata;
    }

    default() {
        return new Contract({ owner_id: "" });
    }

    /*
        MINT
    */
    @call
    nft_mint({ token_id, metadata, receiver_id }) {
        assert(
            near.predecessorAccountId() === this.owner_id,
            "Only Events contract can mint NFTs"
        );
        return internalMint({
            contract: this,
            tokenId: token_id,
            metadata: metadata,
            receiverId: receiver_id,
        });
    }

    /*
        CORE
    */
    @view
    //get the information for a specific token ID
    nft_token({ token_id }) {
        return internalNftToken({ contract: this, tokenId: token_id });
    }

    @call
    //implementation of the nft_transfer method. This transfers the NFT from the current owner to the receiver.
    nft_transfer({ receiver_id, token_id, approval_id, memo }) {
        return internalNftTransfer({
            contract: this,
            receiverId: receiver_id,
            tokenId: token_id,
            approvalId: approval_id,
            memo: memo,
        });
    }

    @call
    //implementation of the transfer call method. This will transfer the NFT and call a method on the receiver_id contract
    nft_transfer_call({ receiver_id, token_id, approval_id, memo, msg }) {
        return internalNftTransferCall({
            contract: this,
            receiverId: receiver_id,
            tokenId: token_id,
            approvalId: approval_id,
            memo: memo,
            msg: msg,
        });
    }

    @call
    //resolves the cross contract call when calling nft_on_transfer in the nft_transfer_call method
    //returns true if the token was successfully transferred to the receiver_id
    nft_resolve_transfer({
        authorized_id,
        owner_id,
        receiver_id,
        token_id,
        approved_account_ids,
        memo,
    }) {
        return internalResolveTransfer({
            contract: this,
            authorizedId: authorized_id,
            ownerId: owner_id,
            receiverId: receiver_id,
            tokenId: token_id,
            approvedAccountIds: approved_account_ids,
            memo: memo,
        });
    }

    /*
        APPROVALS
    */
    @view
    //check if the passed in account has access to approve the token ID
    nft_is_approved({ token_id, approved_account_id, approval_id }) {
        return internalNftIsApproved({
            contract: this,
            tokenId: token_id,
            approvedAccountId: approved_account_id,
            approvalId: approval_id,
        });
    }

    @call
    //approve an account ID to transfer a token on your behalf
    nft_approve({ token_id, account_id, msg }) {
        return internalNftApprove({
            contract: this,
            tokenId: token_id,
            accountId: account_id,
            msg: msg,
        });
    }

    @call
    //approve an account ID to transfer a token on your behalf
    nft_revoke({ token_id, account_id }) {
        return internalNftRevoke({
            contract: this,
            tokenId: token_id,
            accountId: account_id,
        });
    }

    @call
    //approve an account ID to transfer a token on your behalf
    nft_revoke_all({ token_id }) {
        return internalNftRevokeAll({ contract: this, tokenId: token_id });
    }

    /*
        ENUMERATION
    */
    @view
    //Query for the total supply of NFTs on the contract
    nft_total_supply() {
        return internalTotalSupply({ contract: this });
    }

    @view
    //Query for nft tokens on the contract regardless of the owner using pagination
    nft_tokens({ from_index, limit }) {
        return internalNftTokens({
            contract: this,
            fromIndex: from_index,
            limit: limit,
        });
    }

    @view
    //get the total supply of NFTs for a given owner
    nft_tokens_for_owner({ account_id, from_index, limit }) {
        return internalTokensForOwner({
            contract: this,
            accountId: account_id,
            fromIndex: from_index,
            limit: limit,
        });
    }

    @view
    //Query for all the tokens for an owner
    nft_supply_for_owner({ account_id }) {
        return internalSupplyForOwner({
            contract: this,
            accountId: account_id,
        });
    }

    /*
        METADATA
    */
    @view
    //Query for all the tokens for an owner
    nft_metadata() {
        return this.metadata;
    }
}
