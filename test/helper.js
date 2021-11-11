require("dotenv").config();
const fsPromises = require("fs/promises");
const KoiiSdk = require("@_koi/sdk/node");
const ArLocal = require("arlocal").default;
const Arweave = require("arweave");
const axios = require("axios");
const fsPromises = require("fs/promises");
const kohaku = require("@_koi/kohaku");

const AR_LOCAL_PORT = 1984;
const WALLET_PATH = "test_wallet.json";

const arLocal = new ArLocal(AR_LOCAL_PORT);
const arweave = Arweave.init({
  host: "localhost",
  protocol: "http",
  port: AR_LOCAL_PORT
});

async function setupKoiiNode() {
  // Mine first 10 blocks to avoid weird behavior
  await mineBlock(10);

  // Register Koii contract
  const jwk = await fsPromises.readFile(WALLET_PATH);
  const koiiContractSrc = (await axios.get("https://arweave.net/" + process.env.KOII_CONTRACT_SRC_ID)).data;
  const koiiInitState = await fsPromises.readFile("koii_init_state.json");
  const koiiContractTxId = await kohaku.createContract(arweave, jwk, koiiContractSrc, koiiInitState);
  await mineBlock();

  // Create tools instance using newly registered koii contract
  const tools = KoiiSdk("none", koiiContractTxId, arweave);
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

	// Load task
  //
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
  setupKoiiNode
}
