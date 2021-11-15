const kohaku = require("@_koi/kohaku");

const ARWEAVE_RATE_LIMIT = 1000; // 60000;
const arweave = tools.arweave;
let lastBlock = 0;

async function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", root);
    namespace.express("get", "/id", getId);
  }
}

async function execute(_init_state) {
  let state, block;
  for (;;) {
    await rateLimit();
    try {
      state = await tools.getState(namespace.taskTxId);
      block = await tools.getBlockHeight();
      if (block < lastBlock) block = lastBlock;
    } catch (e) {
      console.error("Error getting task state or block", e);
      continue;
    }
    await (namespace.app ? service : witness)(state, block).catch((e) => {
      console.error("Error while performing task:", e);
    });
    lastBlock = block;
  }
}

async function root(_req, res) {
  res
    .status(200)
    .type("application/json")
    .send(await tools.getState(namespace.taskTxId));
}

function getId(_req, res) {
  res.status(200).send(namespace.taskTxId);
}

async function service(taskState, block) {
  if (lastBlock < block) {
    const input = {
      function: "tallyBalance",
      method: "add"
    }
    const txId = await kohaku.interactWrite(
      arweave,
      tools.wallet,
      namespace.taskTxId,
      input
    );
    console.log(input.function, "tx submitted");
    await checkTxConfirmation(txId, 60000);
  }
}

async function witness(taskState, block) {
  console.log("Witness mode goes here. Empty for demo.");
}

function rateLimit() {
  return new Promise((resolve) => setTimeout(resolve, ARWEAVE_RATE_LIMIT));
}

async function checkTxConfirmation(txId, timeout) {
  console.log(`TxId: ${txId}\nWaiting for confirmation`);
  const start = Date.now();
  for (;;) {
    const status = (await arweave.transactions.getStatus(txId)).status;
    switch (status) {
      case 202:
      case 404:
        break;
      case 200:
        console.log("Transaction found");
        return true;
      default:
        console.error(`Status ${status} while checking tx confirmation`);
        return false;
    }
    const elapsed = Date.now() - start;
    if (timeout && elapsed > timeout) return false
    console.log(Math.round(elapsed / 60000) + "m waiting");
    await rateLimit();
  }
}
