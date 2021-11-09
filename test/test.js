const ArLocal = require("arlocal").default;
const Arweave = require("arweave");

const arLocal = new ArLocal();
const arweave = Arweave.init({
	host: "localhost",
	protocol: "http",
	port: 1984
});

beforeAll(async () => {
	await arLocal.start();
});

afterAll(async () => {
	await arLocal.stop();
});

test("Block height is 0", async () => {
	const networkInfo = await arweave.network.getInfo();
	height = networkInfo.height;
	expect(height).toEqual(0);
});

