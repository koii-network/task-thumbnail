require("dotenv").config();
const fsPromises = require("fs/promises");
const koiiSdk = require("@_koi/sdk/node");
const ArLocal = require("arlocal").default;
const Arweave = require("arweave");
const axios = require("axios");
const kohaku = require("@_koi/kohaku");

const AR_LOCAL_PORT = 1984;
const TASK_PORT = 8887;
const WALLET_PATH = "test/test_wallet.json";

const arLocal = new ArLocal(
  AR_LOCAL_PORT,
  false // Set false to disable logs
);
const arweave = Arweave.init({
  host: "localhost",
  protocol: "http",
  port: AR_LOCAL_PORT
});

async function setupKoiiNode() {
  // Mine first 10 blocks to avoid weird behavior
  await mineBlock(10);

  // Register Koii contract
  const jwk = JSON.parse(await fsPromises.readFile(WALLET_PATH));
  const koiiContractSrc = (await axios.get("https://arweave.net/" + process.env.KOII_CONTRACT_SRC_ID)).data;
  const koiiInitState = await fsPromises.readFile("test/koii_init_state.json");
  const koiiContractId = await kohaku.createContract(arweave, jwk, koiiContractSrc, koiiInitState);
  await mineBlock();

  // Register task to Koii contract
  const taskContractSrc = await fsPromises.readFile("dist/contract_src.js");
  const taskInitState = await fsPromises.readFile("contract/init_state.json");
  const taskContractId = await kohaku.createContract(arweave, jwk, taskContractSrc, taskInitState);
  await mineBlock();
  await kohaku.interactWrite(arweave, jwk, koiiContractId, {
    function: "registerTask",
    taskName: "test",
    taskTxId: taskContractId
  });
  await mineBlock();

  // Create tools instance using newly registered koii contract
  const tools = new koiiSdk.Node("none", koiiContractId, arweave);
  await tools.loadWallet(jwk);

	// Setup service mode
  let expressApp;
  if (process.env.NODE_MODE === "service") {
    tools.loadRedisClient();
    const express = require("express");
    const cors = require("cors");
    const cookieParser = require("cookie-parser");
    expressApp = express();
    expressApp.use(cors());
    expressApp.use(express.urlencoded({ extended: true }));
    expressApp.use(express.json());
    expressApp.use(jsonErrorHandler);
    expressApp.use(cookieParser());
  }

	// Load executable
  const executableSrc = await fsPromises.readFile("executable.js", "utf8");
  const loadedTask = new Function(`
    const [tools, namespace, require] = arguments;
    ${executableSrc}
    return {setup, execute};`
  );
  const executableTask = loadedTask(
    tools,
    new Namespace(taskContractId, expressApp),
    require
  );

  // Initialize kohaku
  await tools.getKoiiStateAwait();
  const initialHeight = kohaku.getCacheHeight();
  console.log("Kohaku initialized to height", kohaku.getCacheHeight());
  if (initialHeight < 1) throw new Error("Failed to initialize");

  // Initialize tasks then start express app
  await executableTask.setup(null);
  if (process.env.NODE_MODE === "service") {
    expressApp.get("/tasks", (_req, res) => {
      res.send([taskContractId]);
    });
    expressApp.listen(TASK_PORT, () => {
      console.log(`Open http://localhost:${TASK_PORT} to view in browser`);
    });
    const routes = expressApp._router.stack
      .map((route) => route.route)
      .filter((route) => route !== undefined)
      .map((route) => route.path);
    console.log("Routes:\n-", routes.join("\n- "));
  }

  // Execute tasks
  await executableTask.execute(null);
  console.log("All tasks complete");
}

class Namespace {
  constructor(taskTxId, expressApp) {
    this.taskTxId = taskTxId;
    this.app = expressApp;
  }
  redisGet(path) {
    return tools.redisGetAsync(this.taskTxId + path);
  }
  redisSet(path, data) {
    return tools.redisSetAsync(this.taskTxId + path, data);
  }
  async fs(method, path, ...args) {
    const basePath = "namespace/" + this.taskTxId;
    await fsPromises.mkdir(basePath, { recursive: true }).catch(() => {});
    return fsPromises[method](`${basePath}/${path}`, ...args);
  }
  express(method, path, callback) {
    return this.app[method]("/" + this.taskTxId + path, callback);
  }
}

async function mineBlock(amount) {
  let url = `http://localhost:${AR_LOCAL_PORT}/mine/`;
  if (amount) url += amount;
  return axios.get(url);
}

function jsonErrorHandler(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error(err);
    return res.status(400).send({ status: 404, message: err.message }); // Bad request
  }
  next();
}

module.exports = {
  arLocal,
  arweave,
  setupKoiiNode,
  mineBlock
}
