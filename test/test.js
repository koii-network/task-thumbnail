const {
  arLocal,
  arweave,
  setupKoiiNode,
  mineBlock
} = require("./helper");

beforeAll(async () => {
  await arLocal.start();
  await setupKoiiNode();
});

afterAll(async () => {
  await arLocal.stop();
});

test("Block height is 0", async () => {
  const networkInfo = await arweave.network.getInfo();
  height = networkInfo.height;
  expect(height).toBeGreaterThan(10);
});

