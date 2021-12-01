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
// namespace.express("static", "public");
async function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", root);
    namespace.express("get", "/thumbnail/:id", getId);
    namespace.express("get", "/thumbnailimg/public/output.webp", getimg);
    namespace.express("get", "/generateCard/:id", generateCard);
    namespace.express("post", "/generateCardWithData", generateCardWithData);
  }
  if (!ipfs) ipfs = await IPFS.create();
}

client.set("gtSQKcx3Ex8eOdgZxNh0rWSNiKQCt3Xi02cGnJQ_uSM", "QmVhDHYYas6rnt8frPqKp6T2KjobJfCDVEYEUUH8ZgBZhF", redis.print)
client.get("gtSQKcx3Ex8eOdgZxNh0rWSNiKQCt3Xi02cGnJQ_uSM", function(err, reply) {
  console.log(reply.toString()); // Will print "QmVhDHYYas6rnt8frPqKp6T2KjobJfCDVEYEUUH8ZgBZhF"
});
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

// async function getOrCreateThumbnail(data) {
//   // check if exists on IPFS pin
//   return new Promise((resolve, reject) => {
//     console.log(data.id)
//     client.get( data.id , function(err, cid) {
//       // or create and pin it
//       if (err) reject(err);
      
//       if (cid === null) {
//         const cid = await CreateCid(data)
//       } else {
//         console.log("CID is " + cid.toString());
//         createThumbnail(data);
//       }
      
//       resolve (cid);
      
//       // Will print "CID"
//     })
//   })
// }
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
  const imagePath = "./src/thumbnail/" + data.id + ".png";
  console.log("conent type is " + data.contentType + "  hasImg is " + hasImg)
  // Upload video thumbnail
  if (data.contentType === "video/mp4") {
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
          .toFormat('png')
          .toBuffer();
          const cid = await ipfs.add(resize)
          console.info(cid)
          console.log(data.id + "'s thumbnail is" + cid.path)
          client.set(data.id, cid.path, redis.print)
          fs.unlink(output, (err) => {
            if (err) throw err;
            console.log(output, ' was deleted');
          });
          
      }).catch((err) => {
        console.error(err);
      });
      console.log(cid.path)
      resolve(cid.path);
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
        .toFormat('png')
        // .toFile('public/output.webp')
        .toBuffer()
        // console.log(resize) 
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
