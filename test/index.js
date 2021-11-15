const {
  arLocal,
  arweave,
  setupKoiiNode,
  mineBlock
} = require("./helper");

async function main() {
  await arLocal.start();
  await setupKoiiNode();
  console.log("Waiting 3s for node to setup");
  await sleepAsync(3000);

  const networkInfo = await arweave.network.getInfo();

  for (let height = networkInfo.height; height < 720; ++height) {
    await mineBlock();
    await sleepAsync(200);
  }
}

async function sleepAsync(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

main();
