const {
  arLocal,
  arweave,
  setupKoiiNode,
  mineBlock
} = require("./helper");

async function main() {
  await arLocal.start();
  const tools = await setupKoiiNode();
  console.log("Waiting 3s for node to setup");
  await sleepAsync(3000);

  const networkInfo = await arweave.network.getInfo();

  for (let height = networkInfo.height; height < 720; ++height) {
    await mineBlock();
    await sleepAsync(200);
  }

  console.log("Test finished, press Ctrl + C to exit");
}

async function sleepAsync(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

main();
