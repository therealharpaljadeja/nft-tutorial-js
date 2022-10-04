import { Worker, NEAR } from "near-workspaces";
import anyTest from "ava";

const test = anyTest;

test.beforeEach(async (t) => {
    const worker = await Worker.init();
    const root = worker.rootAccount;

    const nft = await root.createSubAccount("nft");
    const ali = await root.createSubAccount("ali");

    await nft.deploy("build/nft.wasm");

    await nft.call(nft.accountId, "init", { owner_id: ali.accountId });

    const bob = await root.createSubAccount("bob");

    t.context.worker = worker;
    t.context.accounts = { root, nft, ali, bob };
});

test.afterEach(async (t) => {
    await t.context.worker.tearDown().catch((err) => {
        console.log(`Failed to tear down the worker: ${err}`);
    });
});

test("Try minting nfts using address other than owner", async (t) => {
    const { nft, bob } = t.context.accounts;
    await t.throwsAsync(
        bob.call(nft, "nft_mint", {
            token_id: "token-1",
            metadata: {
                title: "My Non Fungible Team Token",
                description: "The Team Most Certainly Goes :)",
                media: "https://bafybeiftczwrtyr3k7a2k4vutd3amkwsmaqyhrdzlhvpt33dyjivufqusq.ipfs.dweb.link/goteam-gif.gif",
            },
            receiver_id: bob.accountId,
        })
    );
});

test("Owner can mint nfts", async (t) => {
    const { nft, ali } = t.context.accounts;
    await ali.call(
        nft,
        "nft_mint",
        {
            token_id: "token-1",
            metadata: {
                title: "My Non Fungible Team Token",
                description: "The Team Most Certainly Goes :)",
                media: "https://bafybeiftczwrtyr3k7a2k4vutd3amkwsmaqyhrdzlhvpt33dyjivufqusq.ipfs.dweb.link/goteam-gif.gif",
            },
            receiver_id: ali.accountId,
        },
        { attachedDeposit: NEAR.parse("1 N").toString() }
    );

    t.is(
        await nft.call(nft, "nft_supply_for_owner", {
            account_id: ali.accountId,
        }),
        1
    );
});

test("Owner can mint nfts to others", async (t) => {
    const { nft, ali, bob } = t.context.accounts;
    await ali.call(
        nft,
        "nft_mint",
        {
            token_id: "token-1",
            metadata: {
                title: "My Non Fungible Team Token",
                description: "The Team Most Certainly Goes :)",
                media: "https://bafybeiftczwrtyr3k7a2k4vutd3amkwsmaqyhrdzlhvpt33dyjivufqusq.ipfs.dweb.link/goteam-gif.gif",
            },
            receiver_id: bob.accountId,
        },
        { attachedDeposit: NEAR.parse("1 N").toString() }
    );

    t.is(
        await nft.call(nft, "nft_supply_for_owner", {
            account_id: bob.accountId,
        }),
        1
    );
});
