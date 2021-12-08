const fs = require("fs");
const Arweave = require("arweave");
const kweb = require("@_koi/sdk/web");
const ktools = new kweb.Web();
const kohaku = require("@_koi/kohaku");
const axios = require("axios");
const crypto = require("crypto");
const sharp = require('sharp');
const extractFrames = require('ffmpeg-extract-frames')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const puppeteer = require('puppeteer');
const IPFS = require('ipfs-core');
const CID = require('multiformats/cid');
const { response } = require("express");
const path = require('path');
let ipfs;
const redis = require('redis');
const client = redis.createClient();
require("dotenv").config();
let contractInitialStateTx = "-cH8D20W-5Rql6sVcKWQ0j0NkjDGqWfqpWkCVNjdsn0";

const ARWEAVE_RATE_LIMIT = 1000; // 60000;
const arweave = ktools.arweave;
let lastBlock = 0;

const taskID = namespace.taskTxId;
console.log(taskID)

let browser = null;
(async () => {
  browser = await puppeteer.launch({
    slowMo: 1000,
    args: ["--no-sandbox"]
  });
  console.log("Browser loaded")
})();

async function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", root);
    namespace.express("get", "/thumbnail/:id", getId);
    namespace.express("get", "/thumbnailimg/public/output.webp", getimg);
  }
  if (!ipfs) ipfs = await IPFS.create();
}

async function execute(_init_state) {
  let state, block;
  for (;;) {
    await rateLimit();
    try {
      state = await ktools.getState(namespace.taskTxId);
      block = await ktools.getBlockHeight();
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
    .send(await ktools.getState(namespace.taskTxId));
}
// ********************* GET id and check thumbnail and CID ******************************** //
async function getId(_req, res) {
  if ( !_req.params.id ) res.status(500).send('No ID Provided');
  let data;
    try {
      data = await ktools.getNftState( _req.params.id );
    } catch (e) {
      console.log("NFT not found or error getting data: ", e);
      res.status(500).send({ success: false });
      return;
  }
  gatewayURI = "arweave.net"
  var cid = await CreateCid(data);
  console.log(cid)
  var file = `/${taskID}/thumbnailimg/public/output.webp`
  console.log(file)
  const card = await generateSocialCard(data, false, cid, file).catch((err) => {
    console.error(err);
  });
  // res.sendFile(path.resolve(file));
  res.send(card);
}
async function getimg(_req, res) {
  res
    .sendFile(path.resolve('public/output.webp'))
}
async function CreateCid(data) {
    console.log("trying to create CID with ", data);
    data.imgSrc = `https://${gatewayURI}/${data.id}`;
    var thumbnail = await createThumbnail(data);
    console.log("thumbnail's buffer is ", thumbnail)
    const cid = await ipfs.add(thumbnail)
    console.info(cid.path)
    console.log(data.id + "'s thumbnail is" + cid.path)
    client.set(data.id, cid.path, redis.print)
    console.log('cid created', cid.path);
    const filename = "public/output.webp"
    const thumbnailcontent = new Buffer(thumbnail, 'base64')
    fs.writeFile(filename, thumbnailcontent, (err) => {
      if (err) return console.error(err)
      console.log('file saved to ', filename)
    })
    // console.log('thumbnail is' + thumbnail)
    return cid.path
}
// ******************** END Check ************************************ //

const renderMedia = (asBg, data, hasImg) => {
  if (data.contentType === "video/mp4" && !hasImg)
    return `<video class="media" src="https://${gatewayURI}/${data.id}"></video>`;
  if (data.contentType === "text/html" && !hasImg)
    return `<iframe class="media" src="https://${gatewayURI}/${data.id}"></iframe>`;
  if (hasImg)
    return `<img class="media" src="https://koii.live/${data.id}.png"></img>`;
  else if (asBg)
    return `<img class="media" src='https://${gatewayURI}/${data.id}'/></img>`;
  else
    return `<img class="media" src='https://${gatewayURI}/${data.id}'/></img>`;
};
async function generateSocialCard(data, hasImg, cid, file) {
  // NFT preview
  return new Promise(async (resolve, _reject) => {
    const markup = `
      <main>
            <!----- AId and CId Content ---->
            <div> AID is ${data.id} and CID is ${cid} </div>
            <!----- thumbnail Content ---->
            <div> Thumbnail is <img src=${file}> </div>
            <!----- NFT Media Content ---->
            <div class="nft-media">${renderMedia(true, data, hasImg)}</div>
            
      </main>
          `;
    resolve(markup);
  });
}

// *************** Create Thumbnail Function ******************************** //
async function createThumbnail (data, hasImg) {
  // NFT thumbnail upload
  const imagePath = "./public/" + data.id + ".png";
  console.log("conent type is " + data.contentType + "  hasImg is " + hasImg)
  
  if (data.contentType === "video/mp4") { // Upload video thumbnail
    return new Promise((resolve, reject) => {
      extractFrames({
        input: 'https://' + gatewayURI + '/' + data.id,
        output: imagePath,
        offsets: [
          0000
        ]
      })
      .then (async (output) =>{
        const resize = await sharp(output)
          .resize(500, 500, {
            kernel: sharp.kernel.nearest,
            fit: 'contain',
            position: 'centre',
            background: { r: 0, g: 0, b: 0, alpha: 1 }
          })
          // .toFormat('png')
          .withMetadata()
          .toBuffer();
          resolve(resize);
          fs.unlink(output, (err) => {
            if (err) throw err;
            console.log(output, ' was deleted');
          });
          
      }).catch((err) => {
        console.error(err);
      });
    })
  } else if (data.contentType === "text/html") { // upload text/html thumbnail
    return new Promise((resolve, reject) => {
      (async () => {
        const page = await browser.newPage();
        await page.goto(data.imgSrc, {
          waitUntil: "load"
        });
        await page.waitForSelector('#main > div')
        const element = await page.$('#main > div')
        await element.screenshot({ path: imagePath })
          .then(async (path) => {
            const resize = await sharp(path)
              .resize(500, 500, {
                kernel: sharp.kernel.nearest,
                fit: "contain",
                position: "centre",
                background: { r: 0, g: 0, b: 0, alpha: 1 }
              })
              .withMetadata()
              // .toFormat("png")
              .toBuffer();
              resolve(resize);
            fs.unlink(imagePath, (err) => {
              if (err) throw err;
              console.log(imagePath, " was deleted");
            });
          })
          .catch((err) => {
            console.error(err);
          })
          await page.close();
      })();
    })
} else if (hasImg) { // *** NOT USING *** upload POST image thumbnail 
  var buff = new Buffer(data.media, 'base64');
  fs.writeFileSync(imagePath, buff);
   $: resize = await sharp(buff)
      .resize(500, 500, {
        kernel: sharp.kernel.nearest,
        fit: 'contain',
        position: 'centre',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      // .toFormat('png')
      .withMetadata()
      .toBuffer()
      console.log(resize) 
      const { cid } = await ipfs.add(resize)
      console.info(cid)
      console.log("thumbnail" + data.id + ".png has been resize and created");
      fs.unlink(imagePath, (err) => {
        if (err) throw err;
        console.log(imagePath, ' was deleted');
      }
  );
} else { // upload image thumbnail  
  return new Promise((resolve, reject) => {
    axios({
      method: 'get',
      url: "https://" + gatewayURI  + "/" + data.id,
      responseType: 'arraybuffer'
    })
      .then(async (response) => {
      // console.log(response.data)
       const resize = await sharp(response.data)
        .resize(500, 500, {
          kernel: sharp.kernel.nearest,
          fit: 'contain',
          position: 'centre',
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .withMetadata()
        // .toFormat('png')
        .toBuffer()
        resolve(resize);
    })
  })
  

}
};      
// ******************* End Create Thumbnail ************************* //

async function service(taskState, block) {
  if (lastBlock < block) {
    wallet = ktools.wallet;
    const input = {
      function: "proposeUpdate",
      "aid": 'gtSQKcx3Ex8eOdgZxNh0rWSNiKQCt3Xi02cGnJQ_uSM',
      "cid": 'QmVhDHYYas6rnt8frPqKp6T2KjobJfCDVEYEUUH8ZgBZhF'
      }
    const txId = await kohaku.interactWrite(
      arweave,   
      wallet,          
      contractInitialStateTx,
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
  console.log(`Waiting for TX: ${txId}`);
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
