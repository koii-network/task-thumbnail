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
let ipfs;
const redis = require('redis');
const client = redis.createClient();
require("dotenv").config();
let contractInitialStateTx = "-cH8D20W-5Rql6sVcKWQ0j0NkjDGqWfqpWkCVNjdsn0";

const ARWEAVE_RATE_LIMIT = 1000; // 60000;
const arweave = tools.arweave;
let lastBlock = 0;

async function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", root);
    namespace.express("get", "/thumbnail/:id", getId);
    namespace.express("get", "/generateCard/:id", generateCard);
    namespace.express("post", "/generateCardWithData", generateCardWithData);
  }
  if (!ipfs) ipfs = await IPFS.create();
}

client.set("gtSQKcx3Ex8eOdgZxNh0rWSNiKQCt3Xi02cGnJQ_uSM", "QmVhDHYYas6rnt8frPqKp6T2KjobJfCDVEYEUUH8ZgBZhF", redis.print)
client.get("gtSQKcx3Ex8eOdgZxNh0rWSNiKQCt3Xi02cGnJQ_uSM", function(err, reply) {
  console.log(reply.toString()); // Will print "QmVhDHYYas6rnt8frPqKp6T2KjobJfCDVEYEUUH8ZgBZhF"
});
// async function execute(_init_state) {
//   let state, block;
//   for (;;) {
//     await rateLimit();
//     try {
//       state = await tools.getState(namespace.taskTxId);
//       block = await tools.getBlockHeight();
//       if (block < lastBlock) block = lastBlock;
//     } catch (e) {
//       console.error("Error getting task state or block", e);
//       continue;
//     }
//     await (namespace.app ? service : witness)(state, block).catch((e) => {
//       console.error("Error while performing task:", e);
//     });
//     lastBlock = block;
//   }
// }

async function root(_req, res) {
  res
    .status(200)
    .type("application/json")
    .send(await tools.getState(namespace.taskTxId));
}

async function getId(_req, res) {
  if ( !_req.params.id ) res.status(500).send('No ID Provided');

  let result = await getOrCreateThumbnail(_req.params.id);

  res.status(200).send(result);
}

async function getOrCreateThumbnail( id ) {
  // check if exists on IPFS pin

  // or create and pin it
  createThumbnail
  // then return the entire image as a payload object

  return image;
}

async function generateCard(_req, res) {
  if (!_req.params.id) {
    console.log("no id found", _req.id, req);
    res.status(500).send({ success: false });
    return;
  }

  let data;
  try {
    data = await ktools.getNftState(_req.params.id);
  } catch (e) {
    console.log("NFT not found or error getting data: ", e);
    res.status(500).send({ success: false });
    return;
  }
  gatewayURI = "arweave.net"
  console.log("trying to create card with ", data);
  data.imgSrc = `https://${gatewayURI}/${data.id}`;
  let thumb = await createThumbnail(data);
  console.log('thumbnail created', thumb);
  res.send(thumb);
}

async function generateCardWithData(_req, res) {
 
  console.log("generating card from data", _req.body);
  const data = _req.body;
  data.reward = 0;
  data.attention = 0;
  gatewayURI = "arweave.net"
  data.imgSrc = `https://${gatewayURI}/${data.id}`;
  data.data.media = data.media.url.replace(/^data:image\/[a-z]+;base64,/, "");

  createThumbnail(data.data, true).then(thumb => {
    res.sendStatus(200)
    res.json(thumb)
  }).catch((err) => {
    console.error(err);
  });
}

// *************** Create Thumbnail Function ******************************** //
async function createThumbnail (data, hasImg) {
  // NFT thumbnail upload
  const imagePath = "./src/thumbnail/" + data.id + ".png";
  console.log("conent type is " + data.contentType + "  hasImg is " + hasImg)
  // Upload video thumbnail
  if (data.contentType === "video/mp4") {
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
        .toFormat('png')
        .toBuffer();
        const { cid } = await ipfs.add(resize)
        console.info(cid)
        fs.unlink(output, (err) => {
          if (err) throw err;
          console.log(output, ' was deleted');
        });
        
    }).catch((err) => {
      console.error(err);
    })
      .then(async () => {
        await update(data.id, cid)         
    })

  // upload text/html thumbnail
  } else if (data.contentType === "text/html") {
    (async () => {
      const browser = await puppeteer.launch({
        slowMo: 1000,
        args: ["--no-sandbox"]
      });
      const page = await browser.newPage();
      await page.goto(data.imgSrc , {
        waitUntil: 'load',
      });
      await page.screenshot({ path: imagePath })
      .then (async (path) =>{
        const resize = await sharp(path)
          .resize(500, 500, {
            kernel: sharp.kernel.nearest,
            fit: 'contain',
            position: 'centre',
            background: { r: 0, g: 0, b: 0, alpha: 1 }
          })
          .toFormat('png')
          .toBuffer();
          const { cid } = await ipfs.add(resize)
          console.info(cid)
          fs.unlink(imagePath, (err) => {
            if (err) throw err;
            console.log(imagePath, ' was deleted');
          });
          
      }).catch((err) => {
        console.error(err);
      })
        .then(async () => {
          await update(data.id, cid)     
      });
      await browser.close();
    })();

// upload POST image thumbnail  
} else if (hasImg) {
  var buff = new Buffer(data.media, 'base64');
  fs.writeFileSync(imagePath, buff);
   $: resize = await sharp(buff)
      .resize(500, 500, {
        kernel: sharp.kernel.nearest,
        fit: 'contain',
        position: 'centre',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .toFormat('png')
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

await update(data.id, cid);   

// upload image thumbnail  
} else {
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
      .toFormat('png')
      .toBuffer();
      console.log(resize) 
      const { cid } = await ipfs.add(resize)
      console.info(cid)
      await update(data.id, cid);
      return cid
  })
    
}
};      
// ******************* End Create Thumbnail ************************* //

async function service(taskState, block) {
  if (lastBlock < block) {
    const input = {
      function: "proposeUpdate",
      "aid": 'gtSQKcx3Ex8eOdgZxNh0rWSNiKQCt3Xi02cGnJQ_uSM',
      "cid": 'QmVhDHYYas6rnt8frPqKp6T2KjobJfCDVEYEUUH8ZgBZhF'
      }

      // const input = {
      //         function: "proposeSlash",
      //         "uid": 'oDApIgwavkt2Ks2egnIF27iMMLMaVY41raK2l07ONp0',
      //         "data": 'Soma'
      //     }
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
